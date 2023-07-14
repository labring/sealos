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
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/go-logr/logr"
	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	cloudv1 "github.com/labring/sealos/controllers/monitor/api/v1"
	"github.com/labring/sealos/controllers/monitor/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/monitor/internal/manager"
	"github.com/labring/sealos/controllers/pkg/crypto"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
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
		readOperations  util.ReadOperationList
		writeOperations util.ReadOperationList
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

	canConnectToExternalNetwork = os.Getenv(string(cloud.NetWorkEnv)) == cloud.TRUE
	// execute read event
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LicenseName)}).
		WithObject(&license).AddToList(&readOperations)
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.UidSecretName)}).
		WithObject(&uidSecret).AddToList(&readOperations)
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.UrlConfigName)}).
		WithObject(&urlConfig).AddToList(&readOperations)
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LicenseHistory)}).
		WithObject(&licenseHistory).AddToList(&readOperations)
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.LimitSecretName)}).
		WithObject(&clusterLimit).WithCallback(func() error {
		clusterLimit.SetName(string(cloud.LimitSecretName))
		clusterLimit.SetNamespace(string(cloud.Namespace))
		clusterLimit.SetLabels(map[string]string{})
		return r.Client.Create(ctx, &clusterLimit)
	}).AddToList(&readOperations)
	(&util.ReadEventBuilder{}).WithContext(ctx).WithClient(r.Client).
		WithTag(types.NamespacedName{Namespace: req.Namespace, Name: license.Spec.UID}).
		WithObject(&account).AddToList(&readOperations)
	// execute read event
	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to read resources...")
		return ctrl.Result{}, err
	}
	// security judgement before write
	config, err := util.ReadConfigFromConfigMap(string(cloud.UrlConfigName), &urlConfig)
	if err != nil {
		r.logger.Error(err, "failed to read url config")
		return ctrl.Result{}, err
	}
	if util.CheckLicenseExists(&licenseHistory, license.Spec.Token) {
		pack := cloud.NewNotificationPackage(cloud.DuplicateLicenseTitle, cloud.SEALOS, cloud.DuplicateLicenseContent)
		util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
		return ctrl.Result{}, nil
	}

	if err := readOperations.Execute(); err != nil {
		r.logger.Error(err, "failed to read account...")
		return ctrl.Result{}, err
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
		return ctrl.Result{}, err
	}
	// recharge
	(&util.WriteEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&account).
		WithCallback(func() error {
			if !cloud.ContainsFields(payload, "amt") {
				return nil
			}
			amount, err := util.InterfaceToInt64(payload["amt"])
			if err != nil {
				return errors.New("amount error type")
			}
			charge := amount * cloud.BaseCount
			account.Status.Balance += charge
			err = crypto.RechargeBalance(account.Status.EncryptBalance, amount)
			if err != nil {
				r.logger.Error(err, "Recharge Failed, failed to encrypt the balance", "namespace:", req.Namespace, "name:", req.Name)
				pack := cloud.NewNotificationPackage(cloud.RechargeFailedTitle, cloud.SEALOS, cloud.RechargeFailedContent)
				util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
				return err
			}
			err = r.Client.Status().Update(ctx, &account)
			if err != nil {
				r.logger.Error(err, "Recharge Failed, failed to modify the status", "namespace:", req.Namespace, "name:", req.Name)
				pack := cloud.NewNotificationPackage(cloud.RechargeFailedTitle, cloud.SEALOS, cloud.RechargeFailedContent)
				util.SubmitNotificationWithUser(ctx, r.Client, r.logger, req.Namespace, pack)
				return err
			}
			return nil
		}).AddToList(&writeOperations)
	// record
	(&util.WriteEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&licenseHistory).
		WithCallback(func() error {
			size := int64(0)
			for _, value := range licenseHistory.Data {
				size += int64(len(value))
			}
			maxSizeThreshold := resource.MustParse(cloud.MaxSizeThresholdStr)
			if size >= maxSizeThreshold.Value() {
				licenseHistory.Data = make(map[string]string)
			}
			tmpValue := make(map[string]interface{})
			for k, v := range licenseHistory.Data {
				tmpValue[k] = v
			}
			suffix := util.GetNextLicenseKeySuffix(tmpValue, "license")
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
				return err
			}
			return nil
		}).AddToList(&writeOperations)
	// limit
	(&util.WriteEventBuilder{}).WithContext(ctx).WithClient(r.Client).WithObject(&clusterLimit).
		WithCallback(func() error {
			if !cloud.ContainsFields(payload, cloud.Field1, cloud.Field2, cloud.Field3) {
				return nil
			}
			days, err := util.InterfaceToInt64(payload[cloud.Field1])
			if err != nil {
				return err
			}
			nodes, err := util.InterfaceToInt64(payload[cloud.Field2])
			if err != nil {
				return err
			}
			cpus, err := util.InterfaceToInt64(payload[cloud.Field3])
			if err != nil {
				return err
			}
			limit := cloud.ClusterLimits{
				NodeLimit: nodes,
				CpuLimit:  cpus,
				Expire:    time.Now().Add(time.Hour * 24 * time.Duration(days)).Unix(),
			}
			limitString, err := json.Marshal(limit)
			if err != nil {
				r.logger.Error(err, "failed to parse cluster limit")
				return err
			}
			if clusterLimit.Data == nil {
				clusterLimit.Data = make(map[string][]byte)
			}
			tmpValue := make(map[string]interface{})
			for k, v := range clusterLimit.Data {
				tmpValue[k] = v
			}
			suffix := util.GetNextLicenseKeySuffix(tmpValue, "secret")
			newLicenseKeyName := "secret-" + strconv.Itoa(suffix)
			clusterLimit.Data[newLicenseKeyName] = []byte(limitString)
			return r.Client.Create(ctx, &clusterLimit)
		})
	_ = writeOperations.Execute()
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
