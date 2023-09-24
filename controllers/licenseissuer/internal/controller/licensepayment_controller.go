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
	"time"

	"github.com/go-logr/logr"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/pkg/pay"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicensePaymentReconciler reconciles a LicensePayment object
type LicensePaymentReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logger logr.Logger
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the LicensePayment object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.15.0/pkg/reconcile
func (r *LicensePaymentReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Reconciling LicenseIssuer")
	err := DeleteForInvalidPayment(ctx, r.Client)
	if err != nil {
		r.logger.Info("unable to delete invalid payment")
		return ctrl.Result{}, err
	}
	payment := issuerv1.Payment{}

	// Get the payment object
	if err := r.Get(ctx, req.NamespacedName, &payment); err != nil {
		r.logger.Info("unable to fetch Payment")
		return ctrl.Result{}, err
	}

	// Get the payment method
	p, err := pay.NewPayHandler(payment.Spec.PaymentMethod)
	if err != nil {
		r.logger.Info("unable to create payment handler", "pay_id", payment.Spec.UserID)
		return ctrl.Result{}, err
	}
	tradeNO, codeURL, err := p.CreatePayment(payment.Spec.Amount/10000, payment.Spec.UserID)
	if err != nil {
		r.logger.Info("unable to create payment", "pay_id", payment.Spec.UserID)
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, err
	}
	payment.Status.CodeURL = codeURL
	payment.Status.TradeNO = tradeNO
	payment.Status.Status = "Created"

	if err := r.Status().Update(ctx, &payment); err != nil {
		r.logger.Info("unable to update payment status", "pay_id", payment.Spec.UserID)
		return ctrl.Result{}, err
	}

	//qrterminal.Generate(codeURL, qrterminal.L, os.Stdout)
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicensePaymentReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicensePayment Reconciler")
	predicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return true
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return false
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			return false
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		// Uncomment the following line adding a pointer to an instance of the controlled resource as an argument
		For(&issuerv1.Payment{}, builder.WithPredicates(predicate)).
		Complete(r)
}

func CheckPayment(p *issuerv1.Payment) bool {
	if p.Spec.Amount == 0 ||
		p.Spec.UserID == "" ||
		p.Spec.PaymentMethod == "" {
		return false
	}
	if time.Since(p.CreationTimestamp.Time) > time.Minute*5 {
		return false
	}
	return true
}

func DeleteForInvalidPayment(ctx context.Context, client client.Client) error {
	// list all payments
	payments := issuerv1.PaymentList{}
	if err := client.List(ctx, &payments); err != nil {
		return err
	}
	for _, p := range payments.Items {
		if !CheckPayment(&p) {
			if err := client.Delete(ctx, &p); err != nil {
				return err
			}
		}
	}
	return nil
}
