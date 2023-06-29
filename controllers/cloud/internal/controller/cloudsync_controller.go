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

	"github.com/go-logr/logr"
	cloudv1 "github.com/labring/sealos/controllers/cloud/api/v1"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/cloud/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// CloudSyncReconciler reconciles a CloudSync object
type CloudSyncReconciler struct {
	client.Client
	Scheme    *runtime.Scheme
	logger    logr.Logger
	needSync  bool
	syncCache cloud.SyncResponse
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
	r.logger.Info("Enter CloudSyncReconcile", "namespace:", req.Namespace, "name", req.Name)
	var err error
	var config cloud.Config
	var secret corev1.Secret
	var sync cloud.SyncRequest
	var resp cloud.SyncResponse
	var configmap corev1.ConfigMap

	r.logger.Info("Start to get resources that need sync...")
	resource1 := util.NewImportanctResource(&secret, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.SecretName})
	resource2 := util.NewImportanctResource(&configmap, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.ConfigName})
	em := util.GetImportantResource(ctx, r.Client, &resource1)
	if em != nil {
		r.logger.Error(em.Concat(": "), "GetImportantResource error, corev1.Secret")
		return ctrl.Result{}, em.Concat(": ")
	}
	em = util.GetImportantResource(ctx, r.Client, &resource2)
	if em != nil {
		r.logger.Error(em.Concat(": "), "GetImportantResource error, corev1.ConfigMap")
		return ctrl.Result{}, em.Concat(": ")
	}
	config, err = util.ReadConfigFromConfigMap(cloud.ConfigName, &configmap)
	if err != nil {
		r.logger.Error(err, "failed to read config")
		return ctrl.Result{}, err
	}
	url := config.CloudSyncURL
	sync.UID = string(secret.Data["uid"])
	if r.needSync {
		r.logger.Info("Start to communicate with cloud...")
		httpBody, em := cloud.CommunicateWithCloud("POST", url, sync)
		if em != nil {
			r.logger.Error(em.Concat(": "), "failed to communicate with cloud")
			return ctrl.Result{}, em.Concat(": ")
		}
		if !cloud.IsSuccessfulStatusCode(httpBody.StatusCode) {
			err := errors.New(http.StatusText(httpBody.StatusCode))
			r.logger.Error(err, err.Error())
			return ctrl.Result{}, err
		}
		em = cloud.Convert(httpBody.Body, &resp)
		if em != nil {
			r.logger.Error(em.Concat(": "), "failed to convert to cloud.SyncResponse")
			return ctrl.Result{}, em.Concat(": ")
		}
		r.syncCache = resp
	}
	if ok := cloud.IsConfigMapChanged(resp, &configmap); ok {
		r.logger.Info("Start to sync the resources...")
		if err := r.Client.Update(ctx, &configmap); err != nil {
			r.needSync = false
			return ctrl.Result{}, err
		}
	}
	r.needSync = true
	r.syncCache = cloud.SyncResponse{}
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudSyncReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("CloudSyncReconcile")
	r.needSync = true
	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == cloud.ClientStartName &&
			object.GetNamespace() == cloud.Namespace &&
			object.GetLabels() != nil &&
			object.GetLabels()[cloud.IsRead] == cloud.FALSE &&
			object.GetLabels()[cloud.ExternalNetworkAccessLabel] == cloud.Enabled
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
