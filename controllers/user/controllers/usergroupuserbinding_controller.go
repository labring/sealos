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
	"sort"

	"github.com/labring/sealos/controllers/user/controllers/cache"
	"k8s.io/apimachinery/pkg/util/sets"

	"golang.org/x/sync/errgroup"
	apierrors "k8s.io/apimachinery/pkg/api/errors"

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

// UserGroupUserBindingController reconciles a UserGroupBinding user object
type UserGroupUserBindingController struct {
	*UserGroupBindingReconciler
}

func (r *UserGroupUserBindingController) doReconcile(ctx context.Context, ugBinding *userv1.UserGroupBinding) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller userGroupBinding user", "request", client.ObjectKeyFromObject(ugBinding))
	pipelines := []func(ctx context.Context, ugBinding *userv1.UserGroupBinding){
		r.initStatus,
		r.syncClusterRoleGenerate,
		r.syncClusterRoleBindingByOwner,
		r.syncClusterRoleBinding,
		r.syncRoleBinding,
		r.syncFinalStatus,
	}
	if err := r.pipeline(ctx, ugBinding, pipelines); err != nil {
		r.Logger.Error(err, "unable to pipeline UserGroupBinding user")
		return ctrl.Result{Requeue: true}, err
	}
	return ctrl.Result{}, nil
}

func (r *UserGroupUserBindingController) syncClusterRoleGenerate(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	clusterRoleBindingConditionType := userv1.ConditionType("UGUserRoleSyncReady")
	condition := &userv1.Condition{
		Type:               clusterRoleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug user role successfully",
	}
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]
	namespaces := cache.NewCache(r.Client, r.Logger).FetchNamespaceFromUserGroup(ctx, ugBinding.UserGroupRef)
	namespaceSet := sets.NewString()
	for _, namespace := range namespaces {
		namespaceSet.Insert(namespace.Subject.Name)
	}
	namespaceList := namespaceSet.List()
	sort.Strings(namespaceList)

	roleBindingName := ugBinding.Name + "-by-generate"

	r.Logger.V(1).Info("create generate cluster role")
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		clusterRole := &rbacv1.ClusterRole{}
		clusterRole.Name = roleBindingName

		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, clusterRole, func() error {
			if err = controllerutil.SetControllerReference(ugBinding, clusterRole, r.Scheme); err != nil {
				return err
			}
			clusterRole.Annotations = map[string]string{userAnnotationOwnerKey: userName}
			clusterRole.Rules = []rbacv1.PolicyRule{
				{
					Verbs:         []string{"get", "watch", "list"},
					APIGroups:     []string{""},
					Resources:     []string{"namespaces"},
					ResourceNames: namespaceList,
				},
			}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create user UserGroupBinding generate clusterRole")
		}
		r.Logger.V(1).Info("create or update user UserGroupBinding generate clusterRole", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncUGUserRoleError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding generate clusterRole %s is error: %v", ugBinding.Name, err)
	}
	r.Logger.V(1).Info("create generate cluster role binding")
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		clusterRole := &rbacv1.ClusterRoleBinding{}
		clusterRole.Name = roleBindingName

		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, clusterRole, func() error {
			if err = controllerutil.SetControllerReference(ugBinding, clusterRole, r.Scheme); err != nil {
				return err
			}
			clusterRole.Annotations = map[string]string{userAnnotationOwnerKey: userName}
			clusterRole.Subjects = helper.GetUsersSubject(ugBinding.Subject.Name)
			clusterRole.RoleRef = rbacv1.RoleRef{
				APIGroup: rbacv1.SchemeGroupVersion.Group,
				Kind:     "ClusterRole",
				Name:     roleBindingName,
			}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create user UserGroupBinding generate clusterRoleBinding")
		}
		r.Logger.V(1).Info("create or update user UserGroupBinding generate clusterRoleBinding", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncUGUserRoleError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding generate clusterRoleBinding %s is error: %v", ugBinding.Name, err)
	}
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
			clusterRole.Subjects = helper.GetUsersSubject(ugBinding.Subject.Name)
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
				clusterRole.Subjects = helper.GetUsersSubject(ugBinding.Subject.Name)
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

func (r *UserGroupUserBindingController) syncRoleBinding(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	roleBindingConditionType := userv1.ConditionType("UGNamespaceBindingSyncReady")
	condition := &userv1.Condition{
		Type:               roleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync ug namespace binding successfully",
	}

	namespaces := cache.NewCache(r.Client, r.Logger).FetchNamespaceFromUserGroup(ctx, ugBinding.UserGroupRef)
	defer r.saveCondition(ugBinding, condition)
	userName := ugBinding.Annotations[userAnnotationOwnerKey]

	eg, _ := errgroup.WithContext(context.Background())
	for _, v := range namespaces {
		namespace := v
		eg.Go(func() error {
			return retry.RetryOnConflict(retry.DefaultRetry, func() error {
				var change controllerutil.OperationResult
				var err error
				roleBinding := &rbacv1.RoleBinding{}
				roleBinding.Name = ugBinding.Subject.Name + "-role"
				roleBinding.Namespace = namespace.Subject.Name
				if err = r.Get(ctx, client.ObjectKeyFromObject(roleBinding), roleBinding); err != nil {
					if !apierrors.IsNotFound(err) {
						return err
					}
				}
				var created bool
				if !roleBinding.CreationTimestamp.IsZero() {
					r.Logger.V(1).Info("namespace UserGroupBinding roleBinding is created", "OperationResult", change, "user", ugBinding.Subject.Name, "namespace", namespace.Name)
					created = true
				}
				if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
					if !created {
						if err = controllerutil.SetControllerReference(ugBinding, roleBinding, r.Scheme); err != nil {
							return err
						}
					}
					roleBinding.Annotations = map[string]string{userAnnotationOwnerKey: userName}
					roleBinding.Subjects = helper.GetUsersSubject(ugBinding.Subject.Name)
					roleBinding.RoleRef = rbacv1.RoleRef{
						APIGroup: rbacv1.SchemeGroupVersion.Group,
						Kind:     "ClusterRole",
						Name:     roleNamespaceByUser,
					}

					return nil
				}); err != nil {
					return errors.Wrap(err, "unable to create namespace UserGroupBinding roleBinding")
				}
				r.Logger.V(1).Info("create or update namespace UserGroupBinding roleBinding", "OperationResult", change, "user", ugBinding.Subject.Name, "namespace", namespace.Name)
				return nil
			})
		})
	}
	if err := eg.Wait(); err != nil {
		helper.SetConditionError(condition, "SyncUGUserBindingError", err)
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "syncUGUserBinding", "Sync UGUserBinding roleBinding %s is error: %v", ugBinding.Name, err)
	}
}
