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

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserGroupReconciler reconciles a UserGroup object
type UserGroupReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	cache    cache.Cache
	*runtime.Scheme
	client.Client
}

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the UserGroup object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *UserGroupReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for user groups")
	userGroup := &userv1.UserGroup{}
	if err := r.Get(ctx, req.NamespacedName, userGroup); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}
	//ug
	if userGroup.DeletionTimestamp.IsZero() {
		if len(userGroup.Finalizers) == 0 && len(userGroup.OwnerReferences) == 0 {
			_ = r.Delete(ctx, userGroup)
			return ctrl.Result{}, nil
		}
	}
	return ctrl.Result{Requeue: true}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserGroupReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "user_group_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.Logger.V(1).Info("init reconcile controller user group")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.UserGroup{}).
		Complete(r)
}
