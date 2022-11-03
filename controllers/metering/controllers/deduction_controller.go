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
	"time"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	meteringv1 "github.com/labring/sealos/controllers/metering/api/v1"
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

//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.2/pkg/reconcile

func (r *DeductionReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	_ = log.FromContext(ctx)

	meteringList := meteringv1.MeteringList{}
	err := r.List(ctx, &meteringList)
	if err != nil {
		return ctrl.Result{}, err
	}

	for _, metering := range meteringList.Items {
		// get ns
		nsName := metering.Spec.Namespace
		ns := v1.Namespace{}
		if err := r.Get(ctx, client.ObjectKey{Name: nsName}, &ns); err != nil {
			r.Logger.Error(err, "get namespace error")
			continue
		}

		// get account
		var owner string
		if _, ok := ns.Annotations[userv1.UserAnnotationOwnerKey]; !ok {
			r.Logger.Info(fmt.Sprintf("not found owner of namespace name: %v", ns.Name))
			continue
		}
		owner = ns.Annotations[userv1.UserAnnotationOwnerKey]
		account := &userv1.Account{}
		err = r.Get(ctx, client.ObjectKey{Namespace: ACCOUNTNAMESPACE, Name: owner}, account)
		if err != nil {
			r.Logger.Error(err, "get account err", "account", account)
			continue
		}

		// update metering and account
		account.Status.Balance -= metering.Status.TotalAmount
		err = r.Status().Update(ctx, account)
		if err != nil {
			r.Logger.Error(err, "update account err", "account", account)
			continue
		}
		r.Logger.Info("deduction success", "time:", time.Now().String(), "owner", owner, "amount", metering.Status.TotalAmount, "balance", account.Status.Balance)

		metering.Status.TotalAmount = 0
		err = r.Status().Update(ctx, &metering)
		if err != nil {
			r.Logger.Error(err, "update metering err", "metering", metering)
			continue
		}

		if account.Status.Balance > 0 && account.Status.Balance < 1000 {
			r.Logger.Info("your balance is not enough", "balance", account.Status.Balance)
		} else if account.Status.Balance < 0 {
			r.Logger.Info("Your account is in arrears", "balance", account.Status.Balance)
		}
	}
	return ctrl.Result{Requeue: true, RequeueAfter: time.Minute}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *DeductionReconciler) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewControllerManagedBy(mgr).
		For(&meteringv1.Deduction{}).
		Complete(r)
}
