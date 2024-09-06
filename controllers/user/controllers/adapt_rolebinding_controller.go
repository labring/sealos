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

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"

	"sigs.k8s.io/controller-runtime/pkg/builder"

	v1 "k8s.io/api/rbac/v1"

	"sigs.k8s.io/controller-runtime/pkg/event"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"

	"github.com/go-logr/logr"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// TODO This controller is used to adapt the old RoleBinding. only need to deploy the logic once for conversion and delete the controller in the future

// AdaptRoleBindingReconciler reconciles a RoleBinding object, Old Role bindings are backward compatible and will be deleted in the future
type AdaptRoleBindingReconciler struct {
	client.Client
	Scheme *runtime.Scheme
	Logger logr.Logger
}

func (r *AdaptRoleBindingReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	rolebinding := &v1.RoleBinding{}
	if err := r.Get(ctx, req.NamespacedName, rolebinding); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	// old rolebinding only has one subject
	if len(rolebinding.Subjects) != 1 {
		return ctrl.Result{}, nil
	}

	if rolebinding.Subjects[0].Namespace != config.GetUserSystemNamespace() {
		userName := rolebinding.GetAnnotations()[userAnnotationOwnerKey]
		user := &userv1.User{}
		if err := r.Get(ctx, client.ObjectKey{Name: userName}, user); err != nil {
			r.Logger.Error(err, "get user failed")
			return ctrl.Result{}, err
		}
		appendSubject := rolebinding.Subjects[0].DeepCopy()
		appendSubject.Namespace = config.GetUserSystemNamespace()
		rolebinding.Subjects = append(rolebinding.Subjects, *appendSubject)
		if err := r.Update(ctx, rolebinding); err != nil {
			r.Logger.Error(err, "update rolebinding failed")
			return ctrl.Result{}, err
		}
		if err := controllerutil.SetControllerReference(user, rolebinding, r.Scheme); err != nil {
			r.Logger.Error(err, "set controller reference failed")
			return ctrl.Result{}, err
		}
	}
	return ctrl.Result{}, nil
}

// SetupWithManager sets up the controller with the Manager.
func (r *AdaptRoleBindingReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "adapt_rolebinding_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	r.Scheme = mgr.GetScheme()
	r.Logger.V(1).Info("init reconcile AdaptRoleBinding controller")
	return ctrl.NewControllerManagedBy(mgr).
		For(&v1.RoleBinding{}, builder.WithPredicates(WorkspacePredicate{})).
		Complete(r)
}

type WorkspacePredicate struct {
}

func (WorkspacePredicate) Create(e event.CreateEvent) bool {
	return isWorkspaceObject(e.Object)
}

func (WorkspacePredicate) Delete(_ event.DeleteEvent) bool {
	return false
}

func (WorkspacePredicate) Update(_ event.UpdateEvent) bool {
	return false
}

func (WorkspacePredicate) Generic(_ event.GenericEvent) bool {
	return false
}

func isWorkspaceObject(obj client.Object) bool {
	rolebinding, ok := obj.(*v1.RoleBinding)
	if !ok {
		return false
	}
	anno := obj.GetAnnotations()
	if anno == nil {
		return false
	}
	if anno["user.sealos.io/owner"] == "" {
		return false
	}
	if len(obj.GetOwnerReferences()) > 0 {
		return false
	}

	for _, sub := range rolebinding.Subjects {
		if sub.Namespace == config.GetUserSystemNamespace() {
			return false
		}
	}
	return true
}
