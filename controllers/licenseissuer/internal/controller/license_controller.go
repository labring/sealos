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
	"os"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	issuerv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	issuer "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
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
	Scheme       *runtime.Scheme
	needRecharge bool
	logger       logr.Logger
	Retries      int
}

//+kubebuilder:rbac:groups=core,resources=secrets,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=configmaps,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=account.sealos.io,resources=accounts/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=notification.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=licenses/finalizers,verbs=update

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

	var canConnectToExternalNetwork bool
	var (
		readOperations  issuer.ReadOperationList
		writeOperations issuer.WriteOperationList
	)
	var (
		license        issuerv1.License
		clusterLimit   corev1.Secret
		uidSecret      corev1.Secret
		urlConfig      corev1.ConfigMap
		licenseHistory corev1.ConfigMap
		account        accountv1.Account
	)
	var (
		ok      bool
		payload map[string]interface{}
	)

	canConnectToExternalNetwork = os.Getenv(string(issuer.NetWorkEnv)) == issuer.TRUE

	// execute read event
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: req.Namespace, Name: string(issuer.LicenseName)}).
		WithObject(&license).AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.UIDSecretName)}).
		WithObject(&uidSecret).AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.URLConfigName)}).
		WithObject(&urlConfig).AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.LicenseHistory)}).
		WithObject(&licenseHistory).AddToList(&readOperations)
	(&issuer.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(issuer.Namespace), Name: string(issuer.AvailableScaleSecretName)}).
		WithObject(&clusterLimit).WithCallback(func() error {
		clusterLimit.SetName(string(issuer.AvailableScaleSecretName))
		clusterLimit.SetNamespace(string(issuer.Namespace))
		clusterLimit.SetLabels(map[string]string{})
		return r.Client.Create(ctx, &clusterLimit)
	}).AddToList(&readOperations)

	// execute read event
	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}

	err := r.Client.Get(ctx, types.NamespacedName{Namespace: "sealos-system", Name: license.Spec.UID}, &account)
	if err != nil {
		r.logger.Error(err, "failed to get account")
		return ctrl.Result{}, err
	}

	// security judgement before write
	config, err := util.ReadConfigFromConfigMap(string(issuer.URLConfigName), &urlConfig)
	if err != nil {
		r.logger.Error(err, "failed to read url config")
		return ctrl.Result{}, err
	}
	if issuer.CheckLicenseExists(&licenseHistory, license.Spec.Token) {
		pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.DuplicateLicenseMessage)
		issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}

	if canConnectToExternalNetwork {
		payload, ok = issuer.LicenseCheckOnExternalNetwork(license, uidSecret, config.LicenseMonitorURL, r.logger)
	} else {
		payload, ok = issuer.LicenseCheckOnInternalNetwork(license)
	}
	// pre-check for license
	if !ok {
		pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.InvalidLicenseMessage)
		issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
		r.logger.Info("invalid license")
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}
	creatTime, err := issuer.InterfaceToInt64(payload[issuer.CreatTimeField])
	if err != nil {
		r.logger.Error(err, "failed to convert license creat time")
		pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.InvalidLicenseMessage)
		issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}
	if time.Unix(creatTime, 0).Add(issuer.LicenseLifetime).Before(time.Now()) {
		pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.ExpiredLicenseMessage)
		issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
		r.logger.Info("expired license")
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}
	// recharge
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		err := issuer.RechargeByLicense(ctx, r.Client, r.logger, account, payload)
		if err != nil {
			pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.RechargeFailedMessage)
			issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
			return err
		}
		pack := issuer.NewNotificationPackage(issuer.LicenseNoticeTitle, issuer.SEALOS, issuer.ValidLicenseMessage)
		issuer.SubmitNotificationWithUser(ctx, r.Client, req.Namespace, pack)
		return nil
	}).AddToList(&writeOperations)

	// limit the scale of cluster
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		return issuer.AdjustScaleOfCluster(ctx, r.Client, clusterLimit, payload)
	}).AddToList(&writeOperations)

	// expand the scale of cluster
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		return issuer.ExpandScaleOfCluster(ctx, r.Client, clusterLimit, payload)
	}).AddToList(&writeOperations)

	// record the license
	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		return issuer.RecordLicense(ctx, r.Client, r.logger, license, licenseHistory)
	}).AddToList(&writeOperations)

	(&issuer.WriteEventBuilder{}).WithCallback(func() error {
		return r.Client.Delete(ctx, &license)
	}).AddToList(&writeOperations)

	_ = writeOperations.Execute()

	r.logger.Info("license has been activated")
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseReconcile")
	r.Retries = 0
	r.needRecharge = true
	Predicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return e.Object.GetName() == string(issuer.LicenseName)
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return e.ObjectNew.GetName() == string(issuer.LicenseName)
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			// Ignore delete events
			return false
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return e.Object.GetName() == string(issuer.LicenseName)
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&issuerv1.License{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
