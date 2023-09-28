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

	"github.com/labring/sealos/controllers/pkg/notification/utils"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"

	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
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
	Scheme  *runtime.Scheme
	logger  logr.Logger
	DBCol   util.MongoHandler
	payload map[string]interface{}

	account accountv1.Account
	license issuerv1.License
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

// Logic:
// get a license
// check the license is valid or not
// if valid, authorize the license
// send notification to user
// delete the license
func (r *LicenseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter LicenseReconcile", "namespace:", req.Namespace, "name", req.Name)
	r.logger.Info("Start to get license-related resource...")
	// for notification
	nq := &utils.NoticeEventQueue{}
	nm := utils.NewNotificationManager(ctx, r.Client, r.logger, 1, 1)
	nb := (&utils.Builder{}).WithLevel(notificationv1.High).
		WithTitle(util.LicenseNoticeTitle).WithFrom(util.Sealos).
		WithType(utils.General)
	receiver := utils.NewReceiver(ctx, r.Client).AddReceiver(req.Namespace)

	reader := &util.Reader{}
	// get license
	reader.Add(&r.license, req.NamespacedName)

	if err := reader.Read(ctx, r.Client); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}

	// Authorize the license
	messgae, err := r.Authorize(ctx)
	nb.WithMessage(messgae).AddToEventQueue(nq)
	nm.Load(receiver, nq.Events).Run()
	if err != nil {
		return ctrl.Result{}, r.Delete(ctx, &r.license)
	}

	_ = r.RecordLicense(r.payload)

	return ctrl.Result{}, r.Delete(ctx, &r.license)
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseReconcile")

	// set up predicate
	Predicate := predicate.Funcs{
		DeleteFunc: func(e event.DeleteEvent) bool {
			// Ignore delete events
			return false
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&issuerv1.License{}, builder.WithPredicates(Predicate)).
		Complete(r)
}

// This function is used to authorize the license
// It will return the message and error
// The logic is:
// 1. Check the license is used or not and is valid or not
// 2. If the license is valid, activate the service according to the license type
func (r *LicenseReconciler) Authorize(ctx context.Context) (string, error) {
	meta := util.LicenseMeta{
		Token: r.license.Spec.Token,
	}
	// check license is valid or not
	message, payload, ok := util.CheckLicense(meta, r.DBCol)
	if !ok {
		return message, errors.New("invalid license")
	}
	r.payload = payload
	// check license type, and activate the service by license type
	// if there is no "typ" field in the payload, return error
	if !util.ContainsFields(payload, util.Type) {
		return util.InvalidLicenseMessage, errors.New("invalid license type")
	}
	// get license type
	licenseType, ok := payload[util.Type].(string)
	if !ok {
		return util.InvalidLicenseMessage, errors.New("invalid license type")
	}
	// activate the service by license type
	switch licenseType {
	case util.Free:
		return r.ForFreeAuthorize(ctx)
	case util.Account:
		return r.ForAccountAuthorize(ctx)
	case util.Cluster:
		return r.ForClusterAuthorize(ctx)
	// add other scenarios here, if you need
	default:
		return util.InvalidLicenseMessage, errors.New("invalid license type")
	}
}

// if the license is a pre-paid license for trial, type is "free", authorize it
func (r *LicenseReconciler) ForFreeAuthorize(ctx context.Context) (string, error) {
	return r.ForAccountAuthorize(ctx)
}

// if the license is a account license, type is "account", authorize it
func (r *LicenseReconciler) ForAccountAuthorize(ctx context.Context) (string, error) {
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
	// authorize service, amount
	if util.ContainsFields(r.payload, util.Amount) {
		err := util.AuthorizeAccountQuota(ctx, r.Client, r.account, r.payload)
		if err != nil {
			return util.RechargeFailedMessage, err
		}
	}
	// add other license-related service here, if you need
	return util.ValidLicenseMessage, nil
}

// if the license is a cluster license, type is "cluster", authorize it
func (r *LicenseReconciler) ForClusterAuthorize(ctx context.Context) (string, error) {
	// get cluster scale billing
	csb := &issuerv1.ClusterScaleBilling{}
	id := types.NamespacedName{
		Namespace: util.GetOptions().GetEnvOptions().Namespace,
		Name:      util.ScaleBilling,
	}
	err := r.Client.Get(ctx, id, csb)
	if err != nil {
		r.logger.Info("failed to get cluster scale billing", "error", err)
		return util.RechargeFailedMessage, err
	}
	if util.ContainsFields(r.payload, util.Amount, util.Policy) {
		policy, ok := r.payload[util.Policy].(string)
		if !ok {
			return util.InvalidLicenseMessage, errors.New("invalid license policy")
		}
		err := util.SetLicensePolicy(policy)
		if err != nil {
			return util.InvalidLicenseMessage, err
		}
		err = util.AuthorizeClusterQuota(ctx, r.Client, csb, r.payload)
		if err != nil {
			return util.RechargeFailedMessage, err
		}
	}

	// add other license-related service here, if you need
	// ......
	return util.ValidLicenseMessage, nil
}

// This function is used to record token and payload to database
func (r *LicenseReconciler) RecordLicense(payload map[string]interface{}) error {
	return util.RecordLicense(r.DBCol, util.NewLicense(r.license.Spec.UID, r.license.Spec.Token, payload))
}
