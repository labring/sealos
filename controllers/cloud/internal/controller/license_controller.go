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
	"os"
	"strconv"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	"github.com/labring/sealos/controllers/pkg/crypto"
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
	if r.Retries > 5 {
		pack := cloud.NewNotificationPackage(cloud.UnKnownErrorOfLicense, cloud.SEALOS, cloud.UnKnownErrorOfLicenseCotentent)
		r.logger.Info("over the max retries")
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return ctrl.Result{}, nil
	}
	r.Retries++
	r.logger.Info("Start to get license-related resource...")
	var canConnectToExternalNetwork bool
	var license cloudv1.License
	var secret corev1.Secret
	var config cloud.Config
	var configMap corev1.ConfigMap
	var payload map[string]interface{}
	var ok bool
	err := r.Client.Get(ctx, types.NamespacedName{Namespace: req.Namespace, Name: req.Name}, &license)
	if err != nil {
		r.logger.Error(err, "failed to get license", "namespace:", req.Namespace, "name:", req.Name)
		return ctrl.Result{}, err
	}
	if license.Labels == nil {
		license.Labels = make(map[string]string)
	}
	license.Labels[string(cloud.IsRead)] = cloud.TRUE
	if err = r.Client.Update(ctx, &license); err != nil {
		r.logger.Error(err, "failed to update the license")
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}
	canConnectToExternalNetwork = os.Getenv(cloud.NetWorkEnv) == cloud.TRUE
	if canConnectToExternalNetwork {
		r.logger.Info("can connect to ExternalNetwork")
	} else {
		r.logger.Info("can't connect to ExternalNetwork")
	}
	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.SecretName)}, &secret)
	if err != nil {
		r.logger.Error(err, "failed to get secret")
		return ctrl.Result{}, err
	}
	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.ConfigName)}, &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get configMap")
		return ctrl.Result{}, err
	}
	config, err = util.ReadConfigFromConfigMap(string(cloud.ConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to read config from configMap")
		return ctrl.Result{}, err
	}
	r.logger.Info("Start to check license...")
	if canConnectToExternalNetwork {
		license.Spec.Key = string(secret.Data["key"])
	}

	if canConnectToExternalNetwork {
		payload, ok = cloud.LicenseCheckOnExternalNetwork(license, secret, config.LicenseMonitorURL, r.logger)
	} else {
		payload, ok = cloud.LicenseCheckOnInternalNetwork(license)
	}
	if !ok {
		err = errors.New("error license")
		r.logger.Error(err, "license invalid", "namespace:", req.Namespace, "name:", req.Name)
		pack := cloud.NewNotificationPackage(cloud.InvalidLicenseTitle, cloud.SEALOS, cloud.InvalidLicenseContent)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return ctrl.Result{}, nil
	}
	var licenseHistory corev1.ConfigMap
	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LicenseHistory)}, &licenseHistory)
	if err != nil {
		r.logger.Error(err, "failed to get license-history configmap", "namespace:", req.Namespace, "name:", req.Name)
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}
	ok = util.CheckLicenseExists(&licenseHistory, license.Spec.Token)
	if ok {
		pack := cloud.NewNotificationPackage(cloud.DuplicateLicenseTitle, cloud.SEALOS, cloud.DuplicateLicenseContent)
		r.logger.Info("the license has been used")
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return ctrl.Result{}, err
	}

	if r.needRecharge {
		r.logger.Info("Start to recharge...")
		amount, err := util.InterfaceToInt64(payload["amt"])
		if err != nil {
			r.logger.Error(err, "license invalid", "namespace:", req.Namespace, "name:", req.Name)
			pack := cloud.NewNotificationPackage(cloud.InvalidLicenseTitle, cloud.SEALOS, cloud.InvalidLicenseContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return ctrl.Result{}, nil
		}
		t, err := util.InterfaceToInt64(payload["iat"])
		if err != nil {
			r.logger.Error(err, "license invalid", "namespace:", req.Namespace, "name:", req.Name)
			pack := cloud.NewNotificationPackage(cloud.InvalidLicenseTitle, cloud.SEALOS, cloud.InvalidLicenseContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return ctrl.Result{}, nil
		}
		if t < time.Now().Add(-3*time.Hour).Unix() {
			r.logger.Error(err, "license invalid", "namespace:", req.Namespace, "name:", req.Name)
			pack := cloud.NewNotificationPackage(cloud.InvalidLicenseTitle, cloud.SEALOS, cloud.LicenseTimeOutContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return ctrl.Result{}, nil
		}

		var account accountv1.Account
		err = r.Client.Get(ctx, types.NamespacedName{Namespace: "sealos-system", Name: license.Spec.UID}, &account)
		if err != nil {
			r.logger.Error(err, "failed to get account cr", "namespace:", req.Namespace, "name:", req.Name)
			return ctrl.Result{RequeueAfter: time.Second * 5}, nil
		}
		charge := amount * cloud.BaseCount
		account.Status.Balance += charge
		encryptBalance := account.Status.EncryptBalance
		encryptBalance, err = crypto.RechargeBalance(encryptBalance, charge)
		if err != nil {
			r.logger.Error(err, "Recharge Failed, failed to encrypt the balance", "namespace:", req.Namespace, "name:", req.Name)
			pack := cloud.NewNotificationPackage(cloud.RechargeFailedTitle, cloud.SEALOS, cloud.RechargeFailedContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return ctrl.Result{RequeueAfter: time.Second * 5}, nil
		}

		account.Status.EncryptBalance = encryptBalance
		err = r.Client.Status().Update(ctx, &account)
		if err != nil {
			r.logger.Error(err, "Recharge Failed, failed to modify the status", "namespace:", req.Namespace, "name:", req.Name)
			pack := cloud.NewNotificationPackage(cloud.RechargeFailedTitle, cloud.SEALOS, cloud.RechargeFailedContent)
			util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
			return ctrl.Result{RequeueAfter: time.Second * 5}, nil
		}
		r.logger.Info("Recharge Success...")
	}
	size := int64(0)
	for _, value := range licenseHistory.Data {
		size += int64(len(value))
	}
	maxSizeThreshold := resource.MustParse(cloud.MaxSizeThresholdStr)
	if size >= maxSizeThreshold.Value() {
		licenseHistory.Data = make(map[string]string)
	}
	suffix := util.GetNextLicenseKeySuffix(licenseHistory.Data)
	newLicenseKeyName := "license-" + strconv.Itoa(suffix)
	if licenseHistory.Data == nil {
		licenseHistory.Data = make(map[string]string)
	}
	licenseHistory.Data[newLicenseKeyName] = license.Spec.Token
	err = r.Client.Update(ctx, &licenseHistory)
	if err != nil {
		r.needRecharge = false
		r.Retries = 0
		r.logger.Error(err, "failed to store license")
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}
	r.needRecharge = true
	r.logger.Info("Success!")
	pack := cloud.NewNotificationPackage(cloud.ValidLicenseTitle, cloud.SEALOS, cloud.ValidLicenseContent)
	util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
	r.Retries = 0
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LicenseReconcile")
	r.Retries = 0
	r.needRecharge = true
	Predicate := predicate.Funcs{
		CreateFunc: func(e event.CreateEvent) bool {
			return e.Object.GetName() == string(cloud.LicenseName) &&
				e.Object.GetLabels() != nil && e.Object.GetLabels()[string(cloud.IsRead)] == cloud.FALSE
		},
		UpdateFunc: func(e event.UpdateEvent) bool {
			return e.ObjectNew.GetName() == string(cloud.LicenseName) &&
				e.ObjectNew.GetLabels() != nil && e.ObjectNew.GetLabels()[string(cloud.IsRead)] == cloud.FALSE
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
