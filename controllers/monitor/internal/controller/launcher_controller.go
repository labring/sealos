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
	cloudv1 "github.com/labring/sealos/controllers/monitor/api/v1"
	"github.com/labring/sealos/controllers/monitor/internal/controller/util"
	cloud "github.com/labring/sealos/controllers/monitor/internal/manager"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// LauncherReconciler reconciles a Launcher object
type LauncherReconciler struct {
	client.Client
	Scheme   *runtime.Scheme
	logger   logr.Logger
	justSync bool
	//justRestart bool
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=launchers,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=launchers/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=launchers/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the Launcher object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *LauncherReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctl ctrl.Result, err error) {
	r.logger.Info("Enter LauncherReconcile", "namespace:", req.Namespace, "name", req.Name)
	r.logger.Info("Start the cloud module...")
	canConnectToExternalNetwork := os.Getenv(cloud.NetWorkEnv) == cloud.TRUE
	var secret corev1.Secret
	var configMap corev1.ConfigMap

	r.logger.Info("Try to get the cloud secret&configmap resource...")
	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.UrlConfigName)}, &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get configmap...")
		return ctrl.Result{}, err
	}

	config, err := util.ReadConfigFromConfigMap(string(cloud.UrlConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get config...")
		return ctrl.Result{}, err
	}
	if r.justSync && canConnectToExternalNetwork {
		_, err := cloud.SyncWithCloud("POST", config.RegisterURL, cloud.RegisterRequest{UID: string(secret.Data["uid"])})
		if err != nil {
			r.justSync = true
			r.logger.Error(err, "failed sync register info to cloud")
			return ctrl.Result{}, err
		}
		r.justSync = false
		err = util.StartCloudModule(ctx, r.Client)
		if err != nil {
			r.logger.Error(err, "failed to start cloud moudle")
			return ctrl.Result{}, err
		}
		return ctrl.Result{}, nil
	}

	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.UidSecretName)}, &secret)
	if err == nil {
		r.logger.Info("start to launch cloud moudle")
		err := util.StartCloudModule(ctx, r.Client)
		if err != nil {
			r.logger.Error(err, "failed to start cloud moudle")
			return ctrl.Result{}, err
		}
		r.logger.Info("success to launch monitor")
		return ctrl.Result{}, nil
	} else {
		secret.Data = make(map[string][]byte)
	}

	uuid, err := util.Register()
	if err != nil {
		r.logger.Error(err, "failed to get register...")
		return ctrl.Result{}, err
	}
	rr := cloud.RegisterRequest{
		UID: uuid,
	}

	secret.Data["uid"] = []byte(uuid)
	secret.SetName(string(cloud.UidSecretName))
	secret.SetNamespace(string(cloud.Namespace))
	if err := r.Client.Create(ctx, &secret); err != nil {
		r.logger.Error(err, "failed to create the register info to the cluster")
		return ctrl.Result{}, err
	}

	if canConnectToExternalNetwork {
		_, err = cloud.SyncWithCloud("POST", config.RegisterURL, rr)
		if err != nil {
			r.justSync = true
			r.logger.Error(err, "failed sync register info to cloud")
			return ctrl.Result{}, err
		}
	}
	r.justSync = false
	if err := util.StartCloudModule(ctx, r.Client); err != nil {
		r.logger.Error(err, "failed to start cloud module")
		return ctrl.Result{}, err
	}
	r.logger.Info("success to launch monitor")
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LauncherReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.logger = ctrl.Log.WithName("LauncherReconcile")
	nameFilter := cloud.MonitorLaunchName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == string(nameFilter) &&
			obj.GetNamespace() == string(namespaceFilter)
	})

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.Launcher{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
