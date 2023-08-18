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
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	notificationv1 "github.com/labring/sealos/controllers/common/notification/api/v1"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	ntf "github.com/labring/sealos/controllers/pkg/notification"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"

	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	logger logr.Logger

	account   accountv1.Account
	license   issuerv1.License
	configMap corev1.ConfigMap
}

//+kubebuilder:rbac:groups=core,resources=persistentvolumes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=nodes,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=namespaces,verbs=get;list;watch
//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=notification.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=licenses/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=infostream.sealos.io,resources=licenses/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the License object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter LicenseReconcile", "namespace:", req.Namespace, "name", req.Name)
	r.logger.Info("Start to get license-related resource...")
	// for notification
	nq := &ntf.NoticeEventQueue{}
	nm := ntf.NewNotificationManager(ctx, r.Client, r.logger, 1, 1)
	nb := (&ntf.Builder{}).WithLevel(notificationv1.High).
		WithTitle(util.LicenseNoticeTitle).WithFrom(util.Sealos).
		WithType(ntf.General)
	receiver := ntf.NewReceiver(ctx, r.Client).AddReceiver(req.Namespace)

	reader := &util.Reader{}
	// get license
	namespace := util.GetOptions().GetEnvOptions().Namespace
	reader.Add(&r.license, types.NamespacedName{Namespace: req.Namespace, Name: util.LicenseName})
	reader.Add(&r.configMap, types.NamespacedName{Namespace: namespace, Name: util.LicenseHistory})

	if err := reader.Read(ctx, r.Client); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}

	// check license is valid or not
	messgae, err := r.Authorize(ctx)
	nb.WithMessage(messgae).AddToEventQueue(nq)
	nm.Load(receiver, nq.Events).Run()
	if err != nil {
		return ctrl.Result{}, r.Delete(ctx, &r.license)
	}

	_ = r.RecordLicense(ctx)

	return ctrl.Result{}, r.Delete(ctx, &r.license)
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseReconcile")
	Predicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return e.Object.GetName() == string(util.LicenseName)
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return e.ObjectNew.GetName() == string(util.LicenseName)
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			// Ignore delete events
			return false
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return e.Object.GetName() == string(util.LicenseName)
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&issuerv1.License{}, builder.WithPredicates(Predicate)).
		Complete(r)
}

func (r *LicenseReconciler) CheckLicense(ctx context.Context) (string, map[string]interface{}, bool) {
	options := util.GetOptions()
	// Check if the license is already used
	ok := util.CheckLicenseExists(&r.configMap, r.license.Spec.Token)
	if ok {
		return util.DuplicateLicenseMessage, nil, false
	}
	// Check if the license is valid
	if options.GetEnvOptions().NetworkConfiguration == "true" {
		payload, ok := util.LicenseCheckOnExternalNetwork(ctx, r.Client, r.license)
		if !ok {
			return util.InvalidLicenseMessage, nil, false
		}
		return "", payload, true
	}
	payload, ok := util.LicenseCheckOnInternalNetwork(r.license)
	if !ok {
		return util.InvalidLicenseMessage, nil, false
	}
	return "", payload, true
}

func (r *LicenseReconciler) Authorize(ctx context.Context) (string, error) {
	message, payload, ok := r.CheckLicense(ctx)
	if !ok {
		return message, errors.New("invalid license")
	}
	// get account
	id := types.NamespacedName{
		Namespace: util.GetOptions().GetEnvOptions().Namespace,
		Name:      r.license.Spec.UID,
	}
	err := r.Client.Get(ctx, id, &r.account)
	if err != nil {
		r.logger.Error(err, "failed to get account")
		return util.RechargeFailedMessage, err
	}
	// recharge
	if util.ContainsFields(payload, util.AmountField) {
		err := util.RechargeByLicense(ctx, r.Client, r.account, payload)
		if err != nil {
			return util.RechargeFailedMessage, err
		}
	}
	return util.ValidLicenseMessage, nil
}

func (r *LicenseReconciler) RecordLicense(ctx context.Context) error {
	return util.RecordLicense(ctx, r.Client, r.license, r.configMap)
}
