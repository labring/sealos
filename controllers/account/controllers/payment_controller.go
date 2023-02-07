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
	"os"
	"time"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"

	"github.com/labring/sealos/pkg/pay"

	"github.com/mdp/qrterminal"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
)

// PaymentReconciler reconciles a Payment object
type PaymentReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
}

//+kubebuilder:rbac:groups=account.sealos.io,resources=payments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=payments/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=account.sealos.io,resources=payments/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Payment object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *PaymentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger = log.FromContext(ctx)

	p := &accountv1.Payment{}
	if err := r.Get(ctx, req.NamespacedName, p); err != nil {
		r.Logger.Error(err, "get payment failed")
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	if p.Status.TradeNO != "" {
		return ctrl.Result{}, nil
	}
	if p.Status.Status == "" {
		p.Status.Status = "Created"
		if err := r.Status().Update(ctx, p); err != nil {
			r.Logger.Error(err, "update payment failed: %v", *p)
			return ctrl.Result{Requeue: true}, err
		}
	}
	tradeNO := pay.GetRandomString(32)
	codeURL, err := pay.WechatPay(p.Spec.Amount, p.Spec.UserID, tradeNO, "", "")
	if err != nil {
		r.Logger.Error(err, "get codeURL failed")
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, err
	}
	p.Status.CodeURL = codeURL
	p.Status.TradeNO = tradeNO

	if err := r.Status().Update(ctx, p); err != nil {
		r.Logger.Error(err, "update payment failed: %v", *p)
		return ctrl.Result{}, err
	}

	qrterminal.Generate(codeURL, qrterminal.L, os.Stdout)
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *PaymentReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "payment_controller"
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Logger.V(1).Info("init reconcile controller payment")
	return ctrl.NewControllerManagedBy(mgr).
		For(&accountv1.Payment{}).
		Complete(r)
}
