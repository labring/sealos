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

	"github.com/labring/sealos/controllers/user/controllers/cache"

	apierrors "k8s.io/apimachinery/pkg/api/errors"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// UserGroupNamespaceBindingController reconciles a UserGroupBinding namespace object
type UserGroupNamespaceBindingController struct {
	*UserGroupBindingReconciler
}

func (r *UserGroupNamespaceBindingController) doReconcile(ctx context.Context, ugBinding *userv1.UserGroupBinding) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller userGroupBinding namespace", "request", client.ObjectKeyFromObject(ugBinding))
	pipelines := []func(ctx context.Context, ugBinding *userv1.UserGroupBinding){
		r.initStatus,
		r.syncNamespace,
		r.syncRoleBinding,
		r.syncFinalStatus,
	}
	if err := r.pipeline(ctx, ugBinding, pipelines); err != nil {
		r.Logger.Error(err, "unable to pipeline UserGroupBinding namespace")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}
func (r *UserGroupNamespaceBindingController) syncNamespace(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	namespaceConditionType := userv1.ConditionType("UGNamespaceSyncReady")
	condition := &userv1.Condition{
		Type:               namespaceConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug namespace successfully",
	}
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		ns := &v1.Namespace{}
		ns.Name = ugBinding.Subject.Name
		ns.Labels = map[string]string{}
		if err = r.Get(ctx, client.ObjectKeyFromObject(ns), ns); err != nil {
			if !apierrors.IsNotFound(err) {
				return err
			}
		}
		var isCreated bool
		if !ns.CreationTimestamp.IsZero() {
			r.Logger.V(1).Info("namespace UserGroupBinding namespace is created", "OperationResult", change, "namespace", ns.Name)
			isCreated = true
		}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ns, func() error {
			if !isCreated {
				if err = controllerutil.SetControllerReference(ugBinding, ns, r.Scheme); err != nil {
					return err
				}
			}
			ns.Annotations = map[string]string{userAnnotationOwnerKey: userName}
			ns.Labels = helper.SetPodSecurity(ns.Labels)

			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create namespace by UserGroupBinding")
		}
		r.Logger.V(1).Info("create or update namespace by UserGroupBinding", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncUGUserBindingError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding namespace %s is error: %v", ugBinding.Name, err)
	}
}

func (r *UserGroupNamespaceBindingController) syncRoleBinding(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	roleBindingConditionType := userv1.ConditionType("UGNamespaceBindingSyncReady")
	condition := &userv1.Condition{
		Type:               roleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug namespace binding successfully",
	}
	users := cache.NewCache(r.Client, r.Logger).FetchUserFromUserGroup(ctx, ugBinding.UserGroupRef)
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]

	eg, _ := errgroup.WithContext(context.Background())
	for _, v := range users {
		user := v
		eg.Go(func() error {
			return retry.RetryOnConflict(retry.DefaultRetry, func() error {
				var change controllerutil.OperationResult
				var err error
				roleBinding := &rbacv1.RoleBinding{}
				roleBinding.Name = user.Subject.Name + "-role"
				roleBinding.Namespace = ugBinding.Subject.Name

				if err = r.Get(ctx, client.ObjectKeyFromObject(roleBinding), roleBinding); err != nil {
					if !apierrors.IsNotFound(err) {
						return err
					}
				}
				var created bool
				if !roleBinding.CreationTimestamp.IsZero() {
					r.Logger.V(1).Info("namespace UserGroupBinding roleBinding is created", "OperationResult", change, "user", roleBinding.Name, "namespace", roleBinding.Namespace)
					created = true
				}

				if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, user.DeepCopy(), func() error {
					if !created {
						if err = controllerutil.SetControllerReference(ugBinding, roleBinding, r.Scheme); err != nil {
							return err
						}
					}
					roleBinding.Annotations = map[string]string{userAnnotationOwnerKey: userName}
					roleBinding.Subjects = helper.GetUsersSubject(user.Subject.Name)
					roleBinding.RoleRef = rbacv1.RoleRef{
						APIGroup: rbacv1.SchemeGroupVersion.Group,
						Kind:     "ClusterRole",
						Name:     roleNamespaceByUser,
					}

					return nil
				}); err != nil {
					return errors.Wrap(err, "unable to create namespace UserGroupBinding roleBinding")
				}
				r.Logger.V(1).Info("create or update namespace UserGroupBinding roleBinding", "OperationResult", change, "user", user.Subject.Name)
				return nil
			})
		})
	}
	if err := eg.Wait(); err != nil {
		helper.SetConditionError(condition, "SyncUGUserBindingError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding roleBinding %s is error: %v", ugBinding.Name, err)
	}
}
