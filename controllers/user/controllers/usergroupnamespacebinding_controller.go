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

	"github.com/labring/endpoints-operator/library/controller"
	v1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserGroupNamespaceBindingController reconciles a UserGroupBinding namespace object
type UserGroupNamespaceBindingController struct {
	*UserGroupBindingReconciler
}

func (r *UserGroupNamespaceBindingController) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	r.Logger.V(1).Info("delete reconcile controller userGroupBinding namespace", "request", req)
	return nil
}

func (r *UserGroupNamespaceBindingController) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller userGroupBinding namespace", "request", req)
	ugBinding := &v1.UserGroupBinding{}
	if err := r.Client.Get(ctx, req.NamespacedName, ugBinding); err != nil {
		r.Logger.Error(err, "unable to fetch UserGroupBinding namespace")
		return ctrl.Result{Requeue: true}, err
	}
	pipelines := []func(ctx context.Context, ugBinding *v1.UserGroupBinding){
		r.initStatus,
		r.syncFinalStatus,
	}
	if err := r.pipeline(ctx, ugBinding, pipelines); err != nil {
		r.Logger.Error(err, "unable to pipeline UserGroupBinding namespace")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func NewUserGroupBindingController(ctx context.Context, req ctrl.Request, reconcile *UserGroupBindingReconciler) controller.Operator {
	ugBinding := &v1.UserGroupBinding{}
	if err := reconcile.Client.Get(ctx, req.NamespacedName, ugBinding); err != nil {
		reconcile.Logger.Error(err, "unable to fetch UserGroupBinding")
		return nil
	}
	if ugBinding.Subject.Kind == "User" {
		return &UserGroupUserBindingController{
			reconcile,
		}
	}
	return &UserGroupNamespaceBindingController{
		reconcile,
	}
}
