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

// CloudClientReconciler reconciles a CloudClient object
type CloudClientReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Users  cloud.UserCategory
	logger logr.Logger
}

//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=cloud.sealos.io,resources=cloudclients/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the CloudClient object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.14.4/pkg/reconcile
func (r *CloudClientReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter CloudClientReconcile", "namespace:", req.Namespace, "name", req.Name)

	r.logger.Info("Start the cloud module...")
	if err := r.Users.GetNameSpace(ctx, r.Client); err != nil {
		r.logger.Error(err.Concat(": "), "failed to get users info")
		return ctrl.Result{}, err.Concat(": ")
	}
	var secret corev1.Secret
	var configMap corev1.ConfigMap

	r.logger.Info("Try to get the cloud secret resource...")
	resource1 := util.NewImportanctResource(&secret, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.SecretName})
	resource2 := util.NewImportanctResource(&configMap, types.NamespacedName{Namespace: cloud.Namespace, Name: cloud.ConfigName})
	if em := util.GetImportantResource(ctx, r.Client, &resource1); em != nil {
		r.logger.Error(em.Concat(": "), "GetImportantResource error, corev1.Secret")
		return ctrl.Result{}, em.Concat(": ")
	}
	if em := util.GetImportantResource(ctx, r.Client, &resource2); em != nil {
		r.logger.Error(em.Concat(": "), "GetImportantResource error, corev1.ConfigMap")
		return ctrl.Result{}, em.Concat(": ")
	}
	var config, err = util.ReadConfigFromConfigMap(cloud.ConfigName, &configMap)
	if err != nil {
		return ctrl.Result{}, err
	}

	if value, ok := secret.Labels["registered"]; ok && value == cloud.TRUE {
		r.logger.Info("Cluster has registered...")
	} else {
		r.logger.Info("Try to register and start the cloud module...")
	}

	rasd := util.NewRegisterAndStartData(ctx, r.Client, &secret, r.Users, config, r.logger)
	em := util.RegisterAndStart(rasd)
	if em != nil {
		r.logger.Error(em.Concat(": "), "failed to register and start")
		return ctrl.Result{}, em.Concat(": ")
	}

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CloudClientReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.Users = cloud.UserCategory{}
	r.logger = ctrl.Log.WithName("CloudClientReconcile")

	nameFilter := cloud.CloudStartName
	namespaceFilter := cloud.Namespace
	Predicates := predicate.NewPredicateFuncs(func(obj client.Object) bool {
		return obj.GetName() == nameFilter &&
			obj.GetNamespace() == namespaceFilter &&
			obj.GetLabels()[cloud.ExternalNetworkAccessLabel] == cloud.Enabled
	})

	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicates)).
		Complete(r)
}
