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
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"

	"github.com/labring/sealos/controllers/cloud/internal/controller/util"
	"github.com/labring/sealos/pkg/utils/logger"
)

// CollectorReconciler reconciles a Collector object
type CollectorReconciler struct {
	client.Client
	Scheme     *runtime.Scheme
	configPath string
	Cloud      cloud.CollectorManager
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=collectors,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=collectors/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=collectors/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Collector object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CollectorReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	logger.Info("enter CollectorReconciler:", "namespace:", req.Namespace, "name:", req.Name)
	var cc v1.CloudClient
	if err := r.Client.Get(ctx, req.NamespacedName, &cc); err != nil {
		logger.Error("CollectorReconciler: failed to get cloudclient instance")
		return ctrl.Result{}, err
	}
	cycletime := time.Duration(cc.Spec.CycleTime) * time.Second

	var secret corev1.Secret
	if !cloud.GetImportantResource(r.Client, &secret, ctx, cloud.Namespace, cloud.SecretName) {
		logger.Error("CollectorReconciler: GetImportantResource: secret", "retrying...")
		return ctrl.Result{RequeueAfter: time.Second * 10}, nil
	}
	uid, err := util.GetUID(r.Client)
	if err != nil {
		return reconcile.Result{}, err
	}
	var config util.Config
	config, err = util.ReadConfigFile(r.configPath)
	if err != nil {
		return reconcile.Result{}, err
	}
	url := config.CollectorURL
	/*

		collector cluster info

	*/
	var collector cloud.Collector
	collector.UID = uid
	collector.Resource.NodeNum = 5

	resp, err := cloud.CommunicateWithCloud("POST", url, collector)
	if err != nil {
		return reconcile.Result{}, err
	}
	if resp.StatusCode != http.StatusOK {
		return reconcile.Result{RequeueAfter: time.Second * 10}, nil
	}

	logger.Info("success to collector information")
	return reconcile.Result{RequeueAfter: cycletime}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CollectorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.configPath = "/etc/config/config.json"
	nameFilter := cloud.ClientStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter &&
			obj.GetNamespace() == namespaceFilter &&
			obj.GetLabels()["isRead"] == "false"
	})
	if err := util.SetField(&r.Cloud, r.Client, "Client"); err != nil {
		return err
	}
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.CloudClient{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
