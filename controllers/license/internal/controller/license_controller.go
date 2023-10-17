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
	accountutil "github.com/labring/sealos/controllers/license/internal/util/account"
	"os"
	"time"

	"github.com/go-logr/logr"
	ctrlsdk "github.com/labring/operator-sdk/controller"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/database"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	Logger    logr.Logger
	finalizer *ctrlsdk.Finalizer

	validator *LicenseValidator
	recorder  *LicenseRecorder
}

// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/finalizers,verbs=update
// +kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch

func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for license")
	license := &licensev1.License{}
	if err := r.Get(ctx, req.NamespacedName, license); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// on delete reconcile, do nothing but remove finalizer and log
	if ok, err := r.finalizer.RemoveFinalizer(ctx, license, func(ctx context.Context, obj client.Object) error {
		r.Logger.V(1).Info("reconcile for license delete")
		return nil
	}); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, license); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.reconcile(ctx, license)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

func (r *LicenseReconciler) reconcile(ctx context.Context, license *licensev1.License) (ctrl.Result, error) {
	r.Logger.V(1).Info("reconcile for license", "license", license.Namespace+"/"+license.Name)

	// check if license is valid
	valid, err := r.validator.Validate(license)
	if err != nil {
		r.Logger.V(1).Error(err, "failed to validate license")
		return ctrl.Result{}, err
	}
	// if license is invalid, update license status to failed
	if !valid {
		r.Logger.V(1).Info("license is invalid", "license", license.Namespace+"/"+license.Name)
		// TODO mv to a function
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		_ = r.Status().Update(ctx, license)
		return ctrl.Result{}, nil
	}

	// check if license has been used
	found, err := r.recorder.Find(ctx, license)
	if err != nil {
		r.Logger.V(1).Error(err, "failed to get license from database")
		return ctrl.Result{}, err
	}
	// if license has been used, update license status to failed
	if found {
		r.Logger.V(1).Info("license has been used", "license", license.Namespace+"/"+license.Name)
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		_ = r.Status().Update(ctx, license)
		return ctrl.Result{}, nil
	}

	// TODO mv to active function
	switch license.Spec.Type {
	case licensev1.AccountLicenseType:
		if err = accountutil.Recharge(ctx, r.Client, license); err != nil {
			r.Logger.V(1).Error(err, "failed to recharge account")
			return ctrl.Result{}, err
		}
	case licensev1.ClusterLicenseType:
		// TODO implement cluster license
	}

	// update license status to active
	license.Status.ActivationTime = time.Now()
	license.Status.Phase = licensev1.LicenseStatusPhaseActive
	_ = r.Status().Update(ctx, license)
	// record license token and key to database to prevent reuse
	if err = r.recorder.Store(ctx, license); err != nil {
		r.Logger.V(1).Error(err, "failed to store license in database")
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Logger = mgr.GetLogger().WithName("controller").WithName("License")
	r.finalizer = ctrlsdk.NewFinalizer(r.Client, "license.sealos.io/finalizer")
	r.Client = mgr.GetClient()
	db, err := database.New(context.Background(), os.Getenv("MONGO_URI"))
	if err != nil {
		return err
	}

	r.validator = &LicenseValidator{
		Client: r.Client,
	}

	r.recorder = &LicenseRecorder{
		Client: r.Client,
		db:     &db,
	}

	// reconcile on generation change
	return ctrl.NewControllerManagedBy(mgr).
		For(&licensev1.License{}, builder.WithPredicates(predicate.And(predicate.GenerationChangedPredicate{}))).
		Complete(r)
}
