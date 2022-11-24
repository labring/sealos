/*
Copyright 2022.

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

package controllers

import (
	"context"
	"fmt"
	"k8s.io/client-go/util/retry"
	"time"

	"github.com/go-logr/logr"
	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// DeductionReconciler reconciles a Deduction object
type DeductionReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logr.Logger
}

const ACCOUNTNAMESPACE = "sealos-system"

//+kubebuilder:rbac:groups=metering.sealos.io,resources=deductions,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=deductions/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=metering.sealos.io,resources=deductions/finalizers,verbs=update
//+kubebuilder:rbac:groups=user.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=accounts/status,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=metering.sealos.io,resources=meterings,verbs=get;list;watch;create;update;patch;delete

func (r *DeductionReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	metering := meteringv1.Metering{}
	err := r.Get(ctx, req.NamespacedName, &metering)
	if err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	ns := v1.Namespace{}
	if err := r.Get(ctx, client.ObjectKey{Name: metering.Spec.Namespace}, &ns); err != nil {
		r.Logger.Error(err, "get namespace error")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// get account
	owner, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]
	if !ok {
		r.Logger.Info(fmt.Sprintf("not found owner of namespace name: %v", ns.Name))
		return ctrl.Result{}, err
	}

	// update account
	totalAmount := metering.Status.TotalAmount
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		account := &userv1.Account{}
		err = r.Get(ctx, client.ObjectKey{Namespace: ACCOUNTNAMESPACE, Name: owner}, account)
		if err != nil {
			//r.Logger.Error(err, "get account err", "account", account)
			return client.IgnoreNotFound(err)
		}
		account.Status.Balance -= totalAmount
		err = r.Status().Update(ctx, account)
		if err != nil {
			r.Logger.Error(err, "update account err", "account", account)
			return err
		}

		r.Logger.Info("deduction success", "time:", time.Now().String(), "owner", owner, "amount", metering.Status.TotalAmount, "balance", account.Status.Balance)
		if account.Status.Balance > 0 && account.Status.Balance < 1000 {
			r.Logger.Info("your balance is not enough", "balance", account.Status.Balance)
		} else if account.Status.Balance < 0 {
			r.Logger.Info("Your account is in arrears", "balance", account.Status.Balance)
		}
		return nil
	}); err != nil {
		return ctrl.Result{}, err
	}

	// update metering
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		meteringNew := &meteringv1.Metering{}
		err = r.Get(ctx, req.NamespacedName, meteringNew)
		if err != nil {
			r.Logger.Error(err, "get metering err", "metering", meteringNew)
			return client.IgnoreNotFound(err)
		}
		meteringNew.Status.TotalAmount -= totalAmount
		err = r.Status().Update(ctx, meteringNew)
		if err != nil {
			r.Logger.Error(err, "metering account err", "metering", meteringNew)
			return err
		}
		return nil
	}); err != nil {
		return ctrl.Result{}, err
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DeductionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "deduction-controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller deduction-controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Metering{}).
		Complete(r)
}
