/*
Copyright 2022 labring.

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

	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/pkg/constants"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"k8s.io/apimachinery/pkg/api/errors"

	"github.com/labring/sealos/pkg/pay"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/log"
	"sigs.k8s.io/controller-runtime/pkg/source"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// AccountReconciler reconciles a Account object
type AccountReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=accounts/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Account object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *AccountReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	log := log.FromContext(ctx)
	payment := &userv1.Payment{}
	err := r.Get(ctx, client.ObjectKey{Namespace: req.Namespace, Name: req.Name}, payment)
	if errors.IsNotFound(err) {
		return ctrl.Result{}, nil
	}
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("failed to get payment: %v", err)
	}
	if payment.Spec.UserID == "" || payment.Spec.Amount == 0 {
		return ctrl.Result{}, fmt.Errorf("payment is invalid: %v", payment)
	}
	if payment.Status.TradeNO == "" {
		return ctrl.Result{Requeue: true, RequeueAfter: time.Millisecond * 300}, nil
	}
	if payment.Status.Status == pay.StatusSuccess {
		return ctrl.Result{}, nil
	}

	account := &userv1.Account{}
	account.Name = payment.Spec.UserID
	account.Namespace = constants.SealosSystemNamespace
	err = r.Get(ctx, client.ObjectKey{Namespace: constants.SealosSystemNamespace, Name: account.Name}, account)
	if errors.IsNotFound(err) {
		account.Status.Balance = 0
		account.Status.ChargeList = []userv1.Charge{}
		log.Info("create account", "account", account)
		if err := r.Create(ctx, account); err != nil {
			return ctrl.Result{}, fmt.Errorf("create account failed: %v", err)
		}
	} else if err != nil {
		return ctrl.Result{}, fmt.Errorf("get account failed: %v", err)
	}

	status, err := pay.QueryOrder(payment.Status.TradeNO)
	if err != nil {
		return ctrl.Result{}, fmt.Errorf("query order failed: %v", err)
	}
	log.Info(fmt.Sprintf("query order: %v", status))
	switch status {
	case pay.StatusSuccess:
		account.Status.ChargeList = append(account.Status.ChargeList, userv1.Charge{
			Amount:  payment.Spec.Amount,
			Time:    metav1.Now(),
			Status:  status,
			TradeNO: payment.Status.TradeNO,
		})
		account.Status.Balance += payment.Spec.Amount
		if err := r.Status().Update(ctx, account); err != nil {
			return ctrl.Result{}, fmt.Errorf("update account failed: %v", err)
		}
		payment.Status.Status = status
		if err := r.Status().Update(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("update payment failed: %v", err)
		}
	case pay.StatusProcessing, pay.StatusNotPay:
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, nil
	case pay.StatusFail:
		if err := r.Delete(ctx, payment); err != nil {
			return ctrl.Result{}, fmt.Errorf("delete payment failed: %v", err)
		}
		return ctrl.Result{}, nil
	default:
		return ctrl.Result{}, fmt.Errorf("unknown status: %v", status)
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AccountReconciler) SetupWithManager(mgr ctrl.Manager) error {
	err := r.Create(context.TODO(), &v1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: constants.SealosSystemNamespace,
		},
	})
	if err != nil && !errors.IsAlreadyExists(err) {
		return fmt.Errorf("failed to create system namespace: %v", err)
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.Account{}).
		Watches(&source.Kind{Type: &userv1.Payment{}}, &handler.EnqueueRequestForObject{}).
		Complete(r)
}
