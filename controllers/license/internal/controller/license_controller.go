/*
Copyright 2023.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package controller

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/go-logr/logr"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/manager"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
	// finalizer *ctrlsdk.Finalizer

	ClusterID       string
	CreateTimestamp metav1.Time

	validator *LicenseValidator
	activator *LicenseActivator
}

var (
	longRequeueRes   = ctrl.Result{RequeueAfter: 30 * time.Minute}
	shortRequeueRes  = ctrl.Result{RequeueAfter: time.Minute}
	immediateRequeue = ctrl.Result{Requeue: true}
	dailyNotify      = 24 * time.Hour
)

const (
	licenseFinalizer           = "license.sealos.io/finalizer"
	licenseProtectionFinalizer = "license.sealos.io/default-license"
	defaultLicenseName         = "default"
	defaultLicenseNamespace    = "ns-admin"
)

// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/finalizers,verbs=update
// +kubebuilder:rbac:groups="",resources=nodes,verbs=get;list;watch

func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for license")
	license := &licensev1.License{}
	if err := r.Get(ctx, req.NamespacedName, license); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if license.DeletionTimestamp.IsZero() {
		// Ensure required finalizers exist; reconcile only after they are set.
		addedFinalizer := false
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latest := &licensev1.License{}
			if err := r.Get(ctx, req.NamespacedName, latest); err != nil {
				return err
			}
			changed := controllerutil.AddFinalizer(latest, licenseFinalizer)
			if isDefaultLicense(latest) {
				changed = controllerutil.AddFinalizer(latest, licenseProtectionFinalizer) || changed
			}
			if !changed {
				return nil
			}
			addedFinalizer = true
			return r.Update(ctx, latest)
		}); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to add finalizer: %w", err)
		}
		if addedFinalizer {
			// Requeue immediately so the reconciler can proceed with the next step.
			return immediateRequeue, nil
		}
	} else {
		if controllerutil.ContainsFinalizer(license, licenseProtectionFinalizer) && isDefaultLicense(license) {
			r.Logger.Info("deletion blocked by protection finalizer", "license", req.NamespacedName)
			return ctrl.Result{}, nil
		}
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			latest := &licensev1.License{}
			if err := r.Get(ctx, req.NamespacedName, latest); err != nil {
				return err
			}
			if controllerutil.RemoveFinalizer(latest, licenseFinalizer) {
				return r.Update(ctx, latest)
			}
			return nil
		}); err != nil {
			return ctrl.Result{}, fmt.Errorf("failed to remove finalizer: %w", err)
		}
		if err := r.checkAndNotifyAllLicenses(ctx); err != nil {
			r.Logger.Error(err, "failed to check and notify all licenses")
		}
		return ctrl.Result{}, nil
	}
	return r.reconcile(ctx, license)
}

func (r *LicenseReconciler) reconcile(
	ctx context.Context,
	license *licensev1.License,
) (ctrl.Result, error) {
	nsName := fmt.Sprintf("%s/%s", license.Namespace, license.Name)
	r.Logger.V(1).Info("reconcile for license", "license", nsName)

	if err := r.validator.Validate(ctx, license); err != nil {
		// Extract validation code if it's a ValidationError
		var reason string

		var validationErr licenseutil.ValidationError
		var phase licensev1.LicenseStatusPhase
		if errors.As(err, &validationErr) {
			reason = validationErr.Message
			switch validationErr.Code {
			case licensev1.ValidationExpired:
				phase = licensev1.LicenseStatusPhaseExpired
			case licensev1.ValidationClusterInfoMismatch:
				phase = licensev1.LicenseStatusPhaseInvalid
			case licensev1.ValidationClusterIDMismatch:
				phase = licensev1.LicenseStatusPhaseMismatch
			default:
				phase = licensev1.LicenseStatusPhaseFailed
			}
		} else {
			// Handle non-ValidationError
			reason = fmt.Sprintf("license validation failed: %v", err)
			phase = licensev1.LicenseStatusPhaseFailed
		}
		updateStatus := &license.Status
		updateStatus.Phase = phase
		updateStatus.Reason = reason
		updateStatus.ActivationTime = license.Status.ActivationTime
		updateStatus.ExpirationTime = license.Status.ExpirationTime
		if updateErr := r.updateStatus(ctx, client.ObjectKeyFromObject(license), updateStatus); updateErr != nil {
			r.Logger.V(1).
				Error(updateErr, "failed to update license status after validation failure", "license", nsName)
			return ctrl.Result{}, updateErr
		}

		// Send notification if license is expired
		if phase == licensev1.LicenseStatusPhaseExpired {
			if notifyErr := r.NotifyIfNeeded(ctx, license); notifyErr != nil {
				r.Logger.V(1).Error(notifyErr, "failed to send license expiration notification", "license", nsName)
			}
		}

		r.Logger.V(1).Error(err, "failed to validate license", "license", nsName)
		return shortRequeueRes, nil
	}

	if err := r.activator.Active(ctx, license); err != nil {
		failStatus := &license.Status
		failStatus.Phase = licensev1.LicenseStatusPhaseFailed
		failStatus.Reason = fmt.Sprintf("license activation failed: %v", err)
		failStatus.ActivationTime = license.Status.ActivationTime
		failStatus.ExpirationTime = license.Status.ExpirationTime
		if updateErr := r.updateStatus(
			ctx,
			client.ObjectKeyFromObject(license),
			failStatus,
		); updateErr != nil {
			r.Logger.Error(
				updateErr,
				"failed to update license status after activation failure",
				"license",
				nsName,
			)
			return ctrl.Result{}, updateErr
		}
		r.Logger.Error(err, "failed to activate license", "license", nsName)
		return shortRequeueRes, nil
	}
	r.Logger.V(1).
		Info("license activated successfully", "license", nsName, "phase", license.Status.Phase)

	// Send notifications for active licenses (e.g., expiring soon, user limit warnings)
	if notifyErr := r.NotifyIfNeeded(ctx, license); notifyErr != nil {
		r.Logger.V(1).Error(notifyErr, "failed to send license notification", "license", nsName)
	}
	notifier := &LicenseNotifier{
		Client: r.Client,
		Logger: r.Logger,
	}
	if err := notifier.markMissingLicenseReadIfExists(ctx); err != nil {
		r.Logger.V(1).Error(err, "failed to mark missing license notification as read", "license", nsName)
	}

	return longRequeueRes, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager, limitOps controller.Options) error {
	r.Logger = mgr.GetLogger().WithName("controller").WithName("License")
	r.Client = mgr.GetClient()

	r.validator = &LicenseValidator{
		Client:    r.Client,
		Logger:    r.Logger,
		ClusterID: r.ClusterID,
	}

	r.activator = &LicenseActivator{
		Client: r.Client,
	}

	if err := mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
				r.Logger.Info("periodic default license ensure triggered")
			}
		}
	})); err != nil {
		return err
	}

	// Add periodic license notification check (daily)
	if err := mgr.Add(manager.RunnableFunc(func(ctx context.Context) error {
		r.Logger.Info("initial license notification check triggered")
		if err := r.checkAndNotifyAllLicenses(ctx); err != nil {
			r.Logger.Error(err, "failed to check and notify all licenses")
		}
		ticker := time.NewTicker(dailyNotify)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return nil
			case <-ticker.C:
				r.Logger.Info("periodic license notification check triggered")
				if err := r.checkAndNotifyAllLicenses(ctx); err != nil {
					r.Logger.Error(err, "failed to check and notify all licenses")
				}
			}
		}
	})); err != nil {
		return err
	}
	// reconcile on generation change
	return ctrl.NewControllerManagedBy(mgr).
		WithOptions(limitOps).
		For(&licensev1.License{}, builder.WithPredicates(predicate.And(predicate.GenerationChangedPredicate{}))).
		Complete(r)
}

func isDefaultLicense(license *licensev1.License) bool {
	return license.Name == defaultLicenseName && license.Namespace == defaultLicenseNamespace
}

func (r *LicenseReconciler) updateStatus(
	ctx context.Context,
	nn types.NamespacedName,
	status *licensev1.LicenseStatus,
) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &licensev1.License{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status = *status
		return r.Client.Status().Update(ctx, original)
	})
}

// checkAndNotifyAllLicenses checks all licenses and sends notifications as needed
func (r *LicenseReconciler) checkAndNotifyAllLicenses(ctx context.Context) error {
	licenseList := &licensev1.LicenseList{}
	if err := r.List(ctx, licenseList); err != nil {
		return fmt.Errorf("failed to list licenses: %w", err)
	}

	notifier := &LicenseNotifier{
		Client: r.Client,
		Logger: r.Logger,
	}

	activeLicenses := make([]*licensev1.License, 0, len(licenseList.Items))
	for i := range licenseList.Items {
		license := &licenseList.Items[i]
		if license.DeletionTimestamp.IsZero() {
			activeLicenses = append(activeLicenses, license)
		}
	}

	if len(activeLicenses) == 0 {
		if err := notifier.ensureMissingLicenseNotification(ctx); err != nil {
			return fmt.Errorf("failed to ensure missing license notification: %w", err)
		}
		return nil
	}

	if err := notifier.markMissingLicenseReadIfExists(ctx); err != nil {
		return fmt.Errorf("failed to mark missing license notification as read: %w", err)
	}

	for _, license := range activeLicenses {
		if err := r.NotifyIfNeeded(ctx, license); err != nil {
			r.Logger.V(1).Error(err, "failed to send notification for license",
				"license", fmt.Sprintf("%s/%s", license.Namespace, license.Name))
			// Continue processing other licenses even if one fails
		}
	}

	return nil
}
