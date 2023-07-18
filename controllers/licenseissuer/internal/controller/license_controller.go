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

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/licenseissuer/api/v1"
	"github.com/labring/sealos/controllers/licenseissuer/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/licenseissuer/internal/manager"
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
		readOperations  cloud.ReadOperationList
		writeOperations cloud.WriteOperationList
	)
	var (
		license        cloudv1.License
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

	canConnectToExternalNetwork = os.Getenv(cloud.NetWorkEnv) == cloud.TRUE

	// execute read event
	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: req.Namespace, Name: string(cloud.LicenseName)}).
		WithObject(&license).AddToList(&readOperations)
	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.UIDSecretName)}).
		WithObject(&uidSecret).AddToList(&readOperations)
	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.URLConfigName)}).
		WithObject(&urlConfig).AddToList(&readOperations)
	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LicenseHistory)}).
		WithObject(&licenseHistory).AddToList(&readOperations)
	(&cloud.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.ClusterScaleSecretName)}).
		WithObject(&clusterLimit).WithCallback(func() error {
		clusterLimit.SetName(string(cloud.ClusterScaleSecretName))
		clusterLimit.SetNamespace(string(cloud.Namespace))
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
	config, err := util.ReadConfigFromConfigMap(string(cloud.URLConfigName), &urlConfig)
	if err != nil {
		r.logger.Error(err, "failed to read url config")
		return ctrl.Result{}, err
	}
	if cloud.CheckLicenseExists(&licenseHistory, license.Spec.Token) {
		pack := cloud.NewNotificationPackage(cloud.DuplicateLicenseTitle, cloud.SEALOS, cloud.DuplicateLicenseContent)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}

	if canConnectToExternalNetwork {
		payload, ok = cloud.LicenseCheckOnExternalNetwork(license, uidSecret, config.LicenseMonitorURL, r.logger)
	} else {
		payload, ok = cloud.LicenseCheckOnInternalNetwork(license)
	}
	if !ok {
		pack := cloud.NewNotificationPackage(cloud.InvalidLicenseTitle, cloud.SEALOS, cloud.InvalidLicenseContent)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		r.logger.Info("invalid license")
		return ctrl.Result{}, r.Client.Delete(ctx, &license)
	}

	// recharge
	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
		err := cloud.RechargeByLicense(ctx, r.Client, r.logger, account, payload)
		if err != nil {
			pack := cloud.NewNotificationPackage(cloud.RechargeFailedTitle, cloud.SEALOS, cloud.RechargeFailedContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return err
		}
		pack := cloud.NewNotificationPackage(cloud.ValidLicenseTitle, cloud.SEALOS, cloud.ValidLicenseContent)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return nil
	}).AddToList(&writeOperations)

	// limit the scale
	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
		return cloud.AdjustScaleOfCluster(ctx, r.Client, clusterLimit, payload)
	}).AddToList(&writeOperations)

	// expand the scale of cluster
	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
		return cloud.ExpandScaleOfClusterTemp(ctx, r.Client, clusterLimit, payload)
	}).AddToList(&writeOperations)

	// record
	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
		return cloud.RecordLicense(ctx, r.Client, r.logger, license, licenseHistory)
	}).AddToList(&writeOperations)

	(&cloud.WriteEventBuilder{}).WithCallback(func() error {
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
			return e.Object.GetName() == string(cloud.LicenseName)
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return e.ObjectNew.GetName() == string(cloud.LicenseName)
		},
		DeleteFunc: func(e event.DeleteEvent) bool {
			// Ignore delete events
			return false
		},
		GenericFunc: func(e event.GenericEvent) bool {
			return e.Object.GetName() == string(cloud.LicenseName)
		},
	}

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.License{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
