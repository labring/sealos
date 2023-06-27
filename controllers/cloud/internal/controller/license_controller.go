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
	"net/http"
	"time"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
)

// LicenseReconciler reconciles a License object
type LicenseReconciler struct {
	client.Client
	Scheme       *runtime.Scheme
	logger       logr.Logger
	MonitorCache cloud.LicenseMonitorResult
	needMonitor  bool
	configPath   string
}

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
	var license cloudv1.License
	var secret corev1.Secret
	var licenseMonitorData cloud.LicenseMonitorRequest
	var LicenseMonitorRes cloud.LicenseMonitorResult
	r.logger.Info("Attempting to retrieve license-related resources...")
	resource1 := util.NewImportanctResource(&license, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.LicenseName})
	resource2 := util.NewImportanctResource(&secret, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.SecretName})
	config, err := util.ReadConfigFile(r.configPath, r.logger)
	if err != nil {
		r.logger.Error(err, "util.ReadConfigFile, failed to read config")
		return ctrl.Result{}, err
	}
	em := util.GetImportantResource(ctx, r.Client, &resource2)
	if em != nil {
		r.logger.Error(em.Concat(": "), "failed to GetImportantResource,secret")
		return ctrl.Result{}, em.Concat(": ")
	}
	em = util.GetImportantResource(ctx, r.Client, &resource1)
	if em != nil {
		r.logger.Error(em.Concat(": "), "failed to GetImportantResource,license")
		return ctrl.Result{}, em.Concat(": ")
	}
	r.logger.Info("Successfully retrieved license-related resources...")

	if r.needMonitor {
		r.logger.Info("Initiating License verification process...")
		licenseMonitorData, em = cloud.NewLicenseMonitorRequest(secret)
		if em != nil {
			r.logger.Error(em.Concat(": "), "failed to generate License Monitor")
			return ctrl.Result{}, em.Concat(": ")
		}
		httpBody, em := cloud.CommunicateWithCloud("POST", config.LicenseMonitorURL, licenseMonitorData)
		if em != nil {
			r.logger.Error(em.Concat(": "), "failed to communicate with cloud")
			return ctrl.Result{}, em.Concat(": ")
		}
		if !cloud.IsSuccessfulStatusCode(httpBody.StatusCode) {
			err := errors.New(http.StatusText(httpBody.StatusCode))
			r.logger.Error(err, http.StatusText(httpBody.StatusCode))
			return ctrl.Result{}, err
		}
		em = cloud.Convert(httpBody.Body, &LicenseMonitorRes)
		if em != nil {
			r.logger.Error(em.Concat(": "), "failed to convert to cloud.License")
			return ctrl.Result{}, em.Concat(": ")
		}
		r.MonitorCache = LicenseMonitorRes
	}
	r.logger.Info("Start to initiate the delivery process")
	// fmt.Println("*****************************************************************")
	// fmt.Println(LicenseMonitorRes.LicensePolicy)
	// fmt.Println("*****************************************************************")
	switch LicenseMonitorRes.LicensePolicy {
	case cloud.Keep:
		break
	default:
		{
			secret.Data["token"] = []byte(LicenseMonitorRes.Token)
			secret.Data["key"] = []byte(LicenseMonitorRes.PublicKey)
			if err := r.Client.Update(ctx, &secret); err != nil {
				r.needMonitor = false
				r.logger.Error(err, "failed to update secret")
				return ctrl.Result{}, err
			}
			if em := util.SubmitLicense(ctx, r.Client, secret, time.Now().Add(time.Minute*5).Unix()); em != nil {
				r.needMonitor = false
				r.logger.Error(em.Concat(": "), "failed to submit new license when check license")
				return ctrl.Result{}, em.Concat(": ")
			}
		}
	}
	r.logger.Info("Success to complete the delivery process")
	r.needMonitor = true
	// 集群管理员的消息通知，提示到账

	return ctrl.Result{RequeueAfter: time.Second * 60}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LicenseReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.configPath = util.ConfigPath
	r.logger = ctrl.Log.WithName("LicenseReconcile")
	r.needMonitor = true

	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == cloud.ClientStartName &&
			object.GetNamespace() == cloud.Namespace &&
			object.GetLabels() != nil &&
			object.GetLabels()["isRead"] == "false"
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
