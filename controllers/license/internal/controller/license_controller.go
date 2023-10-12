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
	"github.com/go-logr/logr"

	ctrlsdk "github.com/labring/operator-sdk/controller"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	Logger    logr.Logger
	finalizer *ctrlsdk.Finalizer
}

// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=license.sealos.io,resources=licenses/finalizers,verbs=update

// TODO add rbac rules

func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for license")
	license := &licensev1.License{}
	if err := r.Get(ctx, req.NamespacedName, license); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, license, func(ctx context.Context, obj client.Object) error {
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

// TODO do real reconcile

func (r *LicenseReconciler) reconcile(ctx context.Context, license *licensev1.License) (ctrl.Result, error) {
	// TODO check license and do something
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	// TODO set controller by mgr
	// TODO add predictor
	// TODO set logger and finalizer
	return ctrl.NewControllerManagedBy(mgr).
		For(&licensev1.License{}).
		Complete(r)
}
