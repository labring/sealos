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

	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserGroupUserBindingController reconciles a UserGroupBinding user object
type UserGroupUserBindingController struct {
	*UserGroupBindingReconciler
}

func (r *UserGroupUserBindingController) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	r.Logger.V(1).Info("delete reconcile controller userGroupBinding user", "request", req)
	return nil
}

func (r *UserGroupUserBindingController) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller userGroupBinding user", "request", req)
	ugBinding := &userv1.UserGroupBinding{}
	if err := r.Client.Get(ctx, req.NamespacedName, ugBinding); err != nil {
		r.Logger.Error(err, "unable to fetch UserGroupBinding user")
		return ctrl.Result{Requeue: true}, err
	}
	pipelines := []func(ctx context.Context, ugBinding *userv1.UserGroupBinding){
		r.initStatus,
		r.syncClusterRoleBindingByOwner,
		r.syncClusterRoleBinding,
		r.syncFinalStatus,
	}
	if err := r.pipeline(ctx, ugBinding, pipelines); err != nil {
		r.Logger.Error(err, "unable to pipeline UserGroupBinding user")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func (r *UserGroupUserBindingController) syncClusterRoleBinding(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	clusterRoleBindingConditionType := userv1.ConditionType("UGUserBindingSyncReady")
	condition := &userv1.Condition{
		Type:               clusterRoleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug user binding successfully",
	}
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		clusterRole := &rbacv1.ClusterRoleBinding{}
		clusterRole.Name = ugBinding.Name + "-by-" + string(userv1.RoleRefTypeUser)

		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, clusterRole, func() error {
			if err = controllerutil.SetControllerReference(ugBinding, clusterRole, r.Scheme); err != nil {
				return err
			}
			clusterRole.Annotations = map[string]string{userAnnotationOwnerKey: userName}
			clusterRole.Subjects = []rbacv1.Subject{
				{
					Kind:     ugBinding.Subject.Kind,
					Name:     ugBinding.Subject.Name,
					APIGroup: rbacv1.SchemeGroupVersion.Group,
				},
			}
			switch ugBinding.RoleRef {
			case userv1.RoleRefTypeUser:
				clusterRole.RoleRef = rbacv1.RoleRef{
					APIGroup: rbacv1.SchemeGroupVersion.Group,
					Kind:     "ClusterRole",
					Name:     clusterRoleByUser,
				}
			case userv1.RoleRefTypeManager:
				clusterRole.RoleRef = rbacv1.RoleRef{
					APIGroup: rbacv1.SchemeGroupVersion.Group,
					Kind:     "ClusterRole",
					Name:     clusterRoleByManager,
				}
			}

			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create user UserGroupBinding clusterRoleBinding")
		}
		r.Logger.V(1).Info("create or update user UserGroupBinding clusterRoleBinding", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncUGUserBindingError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding clusterRoleBinding %s is error: %v", ugBinding.Name, err)
	}
}
func (r *UserGroupUserBindingController) syncClusterRoleBindingByOwner(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	clusterRoleBindingConditionType := userv1.ConditionType("UGUserBindingSyncReadyByOwner")
	condition := &userv1.Condition{
		Type:               clusterRoleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug user binding by owner successfully",
	}
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]
	if userName == ugBinding.Subject.Name {
		if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
			var change controllerutil.OperationResult
			var err error
			clusterRole := &rbacv1.ClusterRoleBinding{}
			clusterRole.Name = ugBinding.Name + "-by-owner"

			if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, clusterRole, func() error {
				if err = controllerutil.SetControllerReference(ugBinding, clusterRole, r.Scheme); err != nil {
					return err
				}
				clusterRole.Annotations = map[string]string{userAnnotationOwnerKey: userName}
				clusterRole.Subjects = []rbacv1.Subject{
					{
						Kind:     ugBinding.Subject.Kind,
						Name:     ugBinding.Subject.Name,
						APIGroup: rbacv1.SchemeGroupVersion.Group,
					},
				}
				clusterRole.RoleRef = rbacv1.RoleRef{
					APIGroup: rbacv1.SchemeGroupVersion.Group,
					Kind:     "ClusterRole",
					Name:     clusterRoleByCreate,
				}

				return nil
			}); err != nil {
				return errors.Wrap(err, "unable to create owner user UserGroupBinding clusterRoleBinding")
			}
			r.Logger.V(1).Info("create or update owner user UserGroupBinding clusterRoleBinding", "OperationResult", change)
			return nil
		}); err != nil {
			helper.SetConditionError(condition, "SyncUGUserBindingByOwnerError", err)
			r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBindingByOwner", "Sync UGUserBindingByOwner clusterRoleBinding %s is error: %v", ugBinding.Name, err)
		}
	}
}
