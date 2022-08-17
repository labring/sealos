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
	"github.com/labring/endpoints-operator/library/controller"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/cache"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
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

//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroups,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroups/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=usergroups/finalizers,verbs=update

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
	r.Logger.V(4).Info("start reconcile for user groups")
	userGroup := &userv1.UserGroup{}
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   userv1.GroupVersion.Group,
			Version: userv1.GroupVersion.Version,
			Kind:    "UserGroup",
		},
		FinalizerName: "sealos.io/user.group.finalizers",
	}
	userGroup.APIVersion = ctr.Gvk.GroupVersion().String()
	userGroup.Kind = ctr.Gvk.Kind
	return ctr.Run(ctx, req, userGroup)
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
	r.Logger.V(4).Info("init reconcile controller user group")
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.UserGroup{}).
		Complete(r)
}

func (r *UserGroupReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	return nil
}

func (r *UserGroupReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(4).Info("update reconcile controller user group", "request", req)
	return ctrl.Result{}, nil
}
