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
	"net/http"
	"time"

	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// CloudSyncReconciler reconciles a CloudSync object
type CloudSyncReconciler struct {
	client.Client
	Scheme     *runtime.Scheme
	Cloud      cloud.CloudSyncManager
	configPath string
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudsyncs/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the CloudSync object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CloudSyncReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger.Info("enter CloudSyncReconciler ", "namespace: ", req.Namespace, "name: ", req.Name)
	var config util.Config
	var secret corev1.Secret
	var cloudConfig corev1.ConfigMap
	var license v1.License
	var reqBody cloud.SyncRequest
	var ok bool
	var err error
	config, err = util.ReadConfigFile(r.configPath)
	if err != nil {
		logger.Error("CloudSyncReconciler: failed to read config from", r.configPath, ":", err)
		return ctrl.Result{}, err
	}
	if ok = cloud.GetImportantResource(r.Client, &secret, ctx, cloud.Namespace, cloud.SecretName); !ok {
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	reqBody.UID = string(secret.Data["uid"])
	resp, err := cloud.CommunicateWithCloud("POST", config.CloudSyncURL, reqBody)
	if err != nil {
		logger.Error("CloudSyncReconciler: failed to synchronize with the cloud.")
		return ctrl.Result{RequeueAfter: time.Second * 5}, err
	}
	if resp.StatusCode != http.StatusOK {
		logger.Error("CloudSyncReconciler: failed to synchronize with the cloud.", "error:", string(resp.Body))
		return ctrl.Result{RequeueAfter: time.Second * 5}, nil
	}

	defer r.Cloud.Reset()

	if err := r.Cloud.Receiver(resp.Body); err != nil {
		logger.Error("CloudSyncReconciler: failed to receive sync info")
		return ctrl.Result{RequeueAfter: time.Second * 5}, err
	}

	if ok = cloud.GetImportantResource(r.Client, &cloudConfig, ctx, cloud.Namespace, cloud.ConfigName); !ok {
		logger.Info("CloudSyncReconciler: failed to get ConfigMap resource")
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	if ok = r.Cloud.Update(r.Client, &cloudConfig, ctx, r.Cloud.ChooseCompareCallBack); !ok {
		logger.Info("CloudSyncReconciler: failed to update ConfigMap resource")
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	if ok = cloud.GetImportantResource(r.Client, &license, ctx, cloud.Namespace, cloud.LicenseName); !ok {
		logger.Info("CloudSyncReconciler: failed to get License resource")
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	if ok = r.Cloud.Update(r.Client, &license, ctx, r.Cloud.ChooseCompareCallBack); !ok {
		logger.Info("CloudSyncReconciler: failed to update License resource")
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	if ok = r.Cloud.Update(r.Client, &secret, ctx, r.Cloud.ChooseCompareCallBack); !ok {
		logger.Info("CloudSyncReconciler: failed to update Secret resource")
		return ctrl.Result{RequeueAfter: time.Second * 60}, nil
	}
	logger.Info("CloudSyncReconciler: succese to sync the cloud data")
	return ctrl.Result{RequeueAfter: time.Second * 60}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.configPath = "/etc/config/config.json"
	nameFilter := cloud.ClientStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter &&
			obj.GetNamespace() == namespaceFilter &&
			obj.GetLabels()["isRead"] == "false"
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.CloudClient{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
