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
	"time"

	v1 "github.com/labring/sealos/controllers/cloud/api/v1"
	cloud "github.com/labring/sealos/controllers/cloud/internal/cloudtool"
	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	"github.com/labring/sealos/pkg/utils/logger"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// NotificationReconciler reconciles a Notification object
type NotificationReconciler struct {
	client.Client
	configPath string
	Cloud      cloud.NotificationManager
	Scheme     *runtime.Scheme
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=notifications/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Notification object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *NotificationReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger.Info("enter NotificationReconcile", "namespace:", req.Namespace, "name:", req.Name)
	var cc v1.CloudClient
	if err := r.Client.Get(ctx, req.NamespacedName, &cc); err != nil {
		logger.Error("NotificationReconcile: failed to get cloudclient instance")
		return ctrl.Result{}, err
	}
	var configMap corev1.ConfigMap
	err := r.Client.Get(ctx, types.NamespacedName{Namespace: "cloud-system", Name: "cloud-config"}, &configMap)
	//config, err := util.ReadConfigFile(r.configPath)
	if err != nil {
		logger.Error("NotificationReconcile: failed to start notification reconciler", err)
		return ctrl.Result{}, err
	}
	var config util.Config
	json.Unmarshal([]byte(configMap.Data["config.json"]), &config)
	cloudURL := config.NotificationURL
	cycletime := time.Duration(cc.Spec.CycleTime) * time.Second

	logger.Info("NotificationReconcile: cycletime: ", cycletime)
	content := cloud.NotificationRequest{Timestamp: cloud.GetTime(&r.Cloud)}
	var cloudreq cloud.HttpBody
	// pull notification from Cloud
	if cloudreq, err = cloud.CommunicateWithCloud("POST", cloudURL, content); err != nil {
		return ctrl.Result{}, err
	}
	logger.Info("NotificationReconcile: success to pull from cloud")
	if err := cloud.CloudCreateCR(&r.Cloud, cloudreq.Body); err != nil {
		return ctrl.Result{}, err
	}
	return ctrl.Result{RequeueAfter: cycletime}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.configPath = "/etc/config/config.json"
	OneDays := 7 * 24 * time.Hour
	r.Cloud.SetTime(time.Now().Unix() - int64(OneDays.Seconds()))
	r.Cloud.SetClient(r.Client)

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
