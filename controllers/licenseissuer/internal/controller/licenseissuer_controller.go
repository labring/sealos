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
	"encoding/json"
	"fmt"
	"time"

	"github.com/labring/sealos/controllers/pkg/crypto"

	"github.com/go-logr/logr"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	"github.com/labring/sealos/controllers/pkg/pay"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicenseIssuerReconciler reconciles a LicenseIssuer object
type LicenseIssuerReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logger logr.Logger
}

//+kubebuilder:rbac:groups=infostream.sealos.io,resources=payments,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=payments/status,verbs=get;update;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the LicenseIssuer object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.15.0/pkg/reconcile
func (r *LicenseIssuerReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Reconciling LicenseIssuer")
	payment := issuerv1.Payment{}
	// Get the payment object
	if err := r.Get(ctx, req.NamespacedName, &payment); err != nil {
		r.logger.Info("unable to fetch Payment")
		return ctrl.Result{}, err
	}
	if payment.Status.Status == "Completed" {
		return ctrl.Result{}, nil
	}
	ok := CheckPayment(&payment)
	if !ok {
		r.logger.Info("invalid payment")
		return ctrl.Result{}, r.Delete(ctx, &payment)
	}
	payHandler, err := pay.NewPayHandler(payment.Spec.PaymentMethod)
	if err != nil {
		r.logger.Info("unable to create payHandler", "pay_id", payment.Spec.PaymentMethod)
		return ctrl.Result{}, err
	}
	// get payment details(status, amount)
	status, orderAmount, err := payHandler.GetPaymentDetails(payment.Status.TradeNO)
	if err != nil {
		r.logger.Info("unable to get payment details", "pay_id", payment.Spec.PaymentMethod)
		return ctrl.Result{}, fmt.Errorf("query order failed: %v", err)
	}
	r.logger.V(1).Info("query order details", "orderStatus", status, "orderAmount", orderAmount)
	// Test:
	// token, err := r.IssuerLicenseToken(&payment)
	// if err != nil {
	// 	r.logger.Info("unable to get license token", "pay_id", payment.Spec.UserID)
	// 	return ctrl.Result{}, err
	// }
	// payment.Status.Token = token
	// payment.Status.Status = "Completed"
	// return ctrl.Result{}, r.Status().Update(context.Background(), &payment)
	return r.IssuerHandle(status, orderAmount, &payment)
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseIssuerReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseIssuer Reconciler")
	predicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return false
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return true
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

func (r *LicenseIssuerReconciler) IssuerHandle(status string, orderAmount int64, payment *issuerv1.Payment) (ctrl.Result, error) {
	switch status {
	case pay.PaymentProcessing, pay.PaymentNotPaid:
		return ctrl.Result{Requeue: true, RequeueAfter: time.Second}, nil
	case pay.PaymentFailed, pay.PaymentExpired:
		return ctrl.Result{}, r.Delete(context.Background(), payment)
	case pay.PaymentSuccess:
		token, err := r.IssuerLicenseToken(payment)
		if err != nil {
			r.logger.Info("unable to get license token", "pay_id", payment.Spec.UserID)
			return ctrl.Result{}, err
		}
		payment.Status.Token = token
		payment.Status.Status = "Completed"
		return ctrl.Result{}, r.Status().Update(context.Background(), payment)
	default:
		return ctrl.Result{}, fmt.Errorf("unknown payment status: %s", status)
	}
}

type LicenseRequest struct {
	Service []byte `json:"service,omitempty"`
}
type LicenseResponse struct {
	Token string `json:"token,omitempty"`
}

func (r *LicenseIssuerReconciler) IssuerLicenseToken(payment *issuerv1.Payment) (string, error) {
	key := util.GetOptions().GetEnvOptions().IssuerKey
	s := payment.Spec.Service
	bytes, err := json.Marshal(s)
	if err != nil {
		r.logger.Info("unable to marshal service", "pay_id", payment.Spec.UserID)
		return "", err
	}
	cryptoBytes, err := crypto.AsymmetricEncryption(bytes, key)

	if err != nil {
		r.logger.Info("unable to encrypt licenseRequest", "pay_id", payment.Spec.UserID)
		return "", err
	}

	request := LicenseRequest{
		Service: cryptoBytes,
	}

	return r.ApplyToken(&request)
}

func (r *LicenseIssuerReconciler) ApplyToken(res *LicenseRequest) (string, error) {
	urlMap, err := util.GetURL(context.Background(), r.Client)
	if err != nil {
		return "", err
	}
	url := urlMap[util.LicenseIssuerURL]
	if url == "" {
		return "", fmt.Errorf("license issuer url is empty")
	}
	req, err := util.Pull(url, res)
	if err != nil {
		return "", err
	}
	licenseResponse := LicenseResponse{}
	err = util.Convert(req.Body, &licenseResponse)
	if err != nil {
		return "", err
	}
	return licenseResponse.Token, nil
}
