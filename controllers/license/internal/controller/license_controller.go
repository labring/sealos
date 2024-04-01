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
	"time"

	database2 "github.com/labring/sealos/controllers/pkg/database"

	"github.com/go-logr/logr"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	"github.com/labring/sealos/controllers/license/internal/util/database"
	utilerrors "github.com/labring/sealos/controllers/license/internal/util/errors"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
	//finalizer *ctrlsdk.Finalizer

	ClusterID string

	validator *LicenseValidator
	recorder  *LicenseRecorder
	activator *LicenseActivator
}

// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/finalizers,verbs=update

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
	// if license is active, do nothing and return
	if license.Status.Phase == licensev1.LicenseStatusPhaseActive {
		r.Logger.V(1).Info("license is active", "license", license.Namespace+"/"+license.Name)
		return ctrl.Result{}, nil
	}

	// check if license is valid
	valid, err := r.validator.Validate(license)
	if errors.Is(err, utilerrors.ErrClusterIDNotMatch) {
		r.Logger.V(1).Info("license clusterID not match", "license", license.Namespace+"/"+license.Name)
		license.Status.Phase = licensev1.LicenseStatusPhaseFailed
		_ = r.Status().Update(ctx, license)
		return ctrl.Result{}, nil
	}
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

	if err := r.activator.Active(license); err != nil {
		r.Logger.V(1).Error(err, "failed to active license")
		return ctrl.Result{}, err
	}

	// update license status to active
	license.Status.ActivationTime = metav1.NewTime(time.Now())
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
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager, db *database.DataBase, accountDB database2.AccountV2) error {
	r.Logger = mgr.GetLogger().WithName("controller").WithName("License")
	r.Client = mgr.GetClient()

	r.validator = &LicenseValidator{
		Client:    r.Client,
		ClusterID: r.ClusterID,
	}

	r.recorder = &LicenseRecorder{
		Client: r.Client,
		db:     db,
	}

	r.activator = &LicenseActivator{
		accountDB: accountDB,
	}

	// reconcile on generation change
	return ctrl.NewControllerManagedBy(mgr).
		For(&licensev1.License{}, builder.WithPredicates(predicate.And(predicate.GenerationChangedPredicate{}))).
		Complete(r)
}
