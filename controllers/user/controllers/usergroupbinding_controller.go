/*
Copyright 2022 labring.

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

package controllers

import (
	"context"
	"strings"

	"github.com/go-logr/logr"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/cache"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserGroupBindingReconciler reconciles a UserGroupBinding object
type UserGroupBindingReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	cache    cache.Cache
	*runtime.Scheme
	client.Client
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroupbindings,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroupbindings/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroupbindings/finalizers,verbs=update

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the UserGroupBinding object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.11.0/pkg/reconcile
func (r *UserGroupBindingReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for userGroupBindings")

	userGroupBinding := &userv1.UserGroupBinding{}
	if err := r.Get(ctx, req.NamespacedName, userGroupBinding); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	//ugn
	if !strings.HasPrefix(userGroupBinding.Name, "ugn") {
		return ctrl.Result{}, nil
	}
	if userGroupBinding.DeletionTimestamp.IsZero() {
		if len(userGroupBinding.Finalizers) == 0 && len(userGroupBinding.OwnerReferences) == 0 {
			_ = r.Delete(ctx, userGroupBinding)
			return ctrl.Result{}, nil
		}
	}
	return ctrl.Result{Requeue: true}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserGroupBindingReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "user_group_binding_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.Logger.V(1).Info("init reconcile controller user group binding")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.UserGroupBinding{}).
		Complete(r)
}
