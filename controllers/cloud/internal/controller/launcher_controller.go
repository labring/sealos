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

// LauncherReconciler reconciles a Launcher object
type LauncherReconciler struct {
	client.Client
	Scheme  *runtime.Scheme
	Users   cloud.UserCategory
	logger  logr.Logger
	Retries int
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
	if r.Retries > 5 {
		return ctrl.Result{}, nil
	}
	r.Retries++
	r.logger.Info("Start the cloud module...")
	if err = r.Users.GetNameSpace(ctx, r.Client); err != nil {
		r.logger.Error(err, "failed to get users info")
		return ctrl.Result{}, err
	}
	var secret corev1.Secret
	var configMap corev1.ConfigMap

	r.logger.Info("Try to get the cloud secret&configmap resource...")

	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.SecretName)}, &secret)
	if err != nil {
		r.logger.Error(err, "failed to get secret...")
		return ctrl.Result{}, err
	}
	err = r.Client.Get(ctx, types.NamespacedName{Namespace: string(cloud.Namespace), Name: string(cloud.ConfigName)}, &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get configmap...")
		return ctrl.Result{}, err
	}

	config, err := util.ReadConfigFromConfigMap(string(cloud.ConfigName), &configMap)
	if err != nil {
		r.logger.Error(err, "failed to get config...")
		return ctrl.Result{}, err
	}

	if value, ok := secret.Labels["registered"]; ok && value == cloud.TRUE {
		r.logger.Info("Cluster has registered...")
	} else {
		r.logger.Info("Try to register and start the cloud module...")
	}

	rasd := util.NewRegisterAndStartData(ctx, r.Client, &secret, r.Users, config, r.logger)
	err = util.RegisterAndStart(rasd)
	if err != nil {
		r.logger.Error(err, "failed to register and start")
		return ctrl.Result{}, err
	}
	r.Retries = 0
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *LauncherReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Users = cloud.UserCategory{}
	r.logger = ctrl.Log.WithName("LauncherReconcile")
	r.Retries = 0
	nameFilter := cloud.CloudStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == string(nameFilter) &&
			obj.GetNamespace() == string(namespaceFilter) &&
			obj.GetLabels()[string(cloud.ExternalNetworkAccessLabel)] == string(cloud.Enabled)
	})

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.Launcher{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
