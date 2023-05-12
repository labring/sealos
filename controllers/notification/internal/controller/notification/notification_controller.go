/*
Copyright 2023 yxxchange@163.com.

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

	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/log"

	ntf "github.com/labring/sealos/controllers/common/notification/api/v1"
)

// NotificationReconciler reconciles a Notification object
type NotificationReconciler struct {
	client.Client
	Scheme *runtime.Scheme
}

//+kubebuilder:rbac:groups=notification.sealos.io.sealos.io,resources=notifications,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=notification.sealos.io.sealos.io,resources=notifications/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=notification.sealos.io.sealos.io,resources=notifications/finalizers,verbs=update

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
	lgr := log.FromContext(ctx)
	lgr.Info("enter reconcil", "name: ", req.Name, "namespace: ", req.Namespace)

	ntf_instance := &ntf.Notification{}
	if err := r.Get(ctx, req.NamespacedName, ntf_instance); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	lgr.Info("get notification in ntf_controller")
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *NotificationReconciler) SetupWithManager(mgr ctrl.Manager) error {

	return ctrl.NewControllerManagedBy(mgr).For(&ntf.Notification{}).
		// Uncomment the following line adding a pointer to an instance of the controlled resource as an argument
		// For().
		Complete(r)
}
