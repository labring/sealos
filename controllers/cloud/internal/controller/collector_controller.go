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
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

// CollectorReconciler reconciles a Collector object
type CollectorReconciler struct {
	client.Client
	Scheme     *runtime.Scheme
	logger     logr.Logger
	configPath string
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
func (r *CollectorReconciler) Reconcile(_ context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.logger.Info("Enter NotificationReconcile", "namespace:", req.Namespace, "name", req.Name)

	// TODO(user): your logic here

	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *CollectorReconciler) SetupWithManager(mgr ctrl.Manager) error {
	r.configPath = util.ConfigPath
	r.logger = ctrl.Log.WithName("CollectorReconcile")

	Predicate := predicate.NewPredicateFuncs(func(object client.Object) bool {
		return object.GetName() == cloud.ClientStartName &&
			object.GetNamespace() == cloud.Namespace &&
			object.GetLabels() != nil &&
			object.GetLabels()["isRead"] == util.FALSE
	})
	return ctrl.NewControllerManagedBy(mgr).
		For(&cloudv1.CloudClient{}, builder.WithPredicates(Predicate)).
		Complete(r)
}
