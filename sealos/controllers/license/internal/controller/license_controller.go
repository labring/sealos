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
	"fmt"
	"time"

	"github.com/go-logr/logr"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	licenseutil "github.com/labring/sealos/controllers/license/internal/util/license"
	database2 "github.com/labring/sealos/controllers/pkg/database"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
	//finalizer *ctrlsdk.Finalizer

	ClusterID string

	validator *LicenseValidator
	activator *LicenseActivator
}

var requeueRes = ctrl.Result{RequeueAfter: time.Minute}

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
	if !license.DeletionTimestamp.IsZero() {
		return ctrl.Result{}, nil
	}
	return r.reconcile(ctx, license)
}

func (r *LicenseReconciler) reconcile(ctx context.Context, license *licensev1.License) (ctrl.Result, error) {
	r.Logger.V(1).Info("reconcile for license", "license", license.Namespace+"/"+license.Name)
	// check if license is valid
	valid, err := r.validator.Validate(license)
	if err != nil {
		r.Logger.V(1).Error(err, "failed to validate license")
		return requeueRes, err
	}

	claims, err := licenseutil.GetClaims(license)
	if err != nil {
		return ctrl.Result{}, err
	}

	switch valid {
	case licensev1.ValidationClusterIDMismatch:
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		license.Status.ValidationCode = valid
		license.Status.Reason = fmt.Sprintf("cluster id mismatch, license cluster id: %s, cluster id: %s", claims.ClusterID, r.ClusterID)
		r.Logger.V(1).Info("cluster id mismatch", "license", license.Namespace+"/"+license.Name, "cluster id", r.ClusterID, "license cluster id", claims.ClusterID)
		_ = r.Status().Update(ctx, license)
		return requeueRes, nil
	case licensev1.ValidationClusterInfoMismatch:
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		license.Status.ValidationCode = valid
		license.Status.Reason = fmt.Sprintf("cluster info mismatch, license cluster info: %v", claims.Data)
		r.Logger.V(1).Info("cluster info mismatch", "license", license.Namespace+"/"+license.Name, "cluster info", claims.Data)
		_ = r.Status().Update(ctx, license)
		return requeueRes, nil
	case licensev1.ValidationExpired:
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		license.Status.ValidationCode = valid
		license.Status.Reason = "license is expired"
		r.Logger.V(1).Info("license is invalid", "license", license.Namespace+"/"+license.Name, "reason", valid)
		_ = r.Status().Update(ctx, license)
		return requeueRes, nil
	case licensev1.ValidationError:
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		license.Status.ValidationCode = valid
		license.Status.Reason = "failed to validate license"
		r.Logger.V(1).Info("failed to validate license", "license", license.Namespace+"/"+license.Name)
		_ = r.Status().Update(ctx, license)
		return requeueRes, nil
	case licensev1.ValidationSuccess:
		// do nothing
	default:
		r.Logger.V(1).Info("unknown validation code", "code", valid)
	}

	if license.Spec.Type == licensev1.AccountLicenseType && license.Status.Phase == licensev1.LicenseStatusPhaseActive {
		r.Logger.V(1).Info("license is active, skip reconcile", "license", license.Namespace+"/"+license.Name)
		return requeueRes, nil
	}

	if err := r.activator.Active(license); err != nil {
		r.Logger.V(1).Error(err, "failed to active license")
		return requeueRes, err
	}
	return ctrl.Result{RequeueAfter: time.Minute * 30}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager, accountDB database2.AccountV2) error {
	r.Logger = mgr.GetLogger().WithName("controller").WithName("License")
	r.Client = mgr.GetClient()

	r.validator = &LicenseValidator{
		Client:    r.Client,
		Logger:    r.Logger,
		ClusterID: r.ClusterID,
	}

	r.activator = &LicenseActivator{
		Client:    r.Client,
		accountDB: accountDB,
	}

	// reconcile on generation change
	return ctrl.NewControllerManagedBy(mgr).
		For(&licensev1.License{}, builder.WithPredicates(predicate.And(predicate.GenerationChangedPredicate{}))).
		Complete(r)
}
