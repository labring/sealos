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
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/util/retry"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
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
	finalizer *controller.Finalizer
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
	r.Logger.V(1).Info("start reconcile for user groups")
	userGroup := &userv1.UserGroup{}
	if err := r.Get(ctx, req.NamespacedName, userGroup); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, userGroup, controller.DefaultFunc); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, userGroup); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.doReconcile(ctx, userGroup)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
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
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, "sealos.io/user.group.finalizers")
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.Logger.V(1).Info("init reconcile controller user group")
	owner := &handler.EnqueueRequestForOwner{OwnerType: &userv1.UserGroup{}, IsController: true}
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.UserGroup{}).
		Watches(&source.Kind{Type: &userv1.UserGroupBinding{}}, owner).
		Complete(r)
}

func (r *UserGroupReconciler) doReconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller user group", "request", client.ObjectKeyFromObject(obj))
	ug, ok := obj.(*userv1.UserGroup)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert UserGroup is error")
	}

	pipelines := []func(ctx context.Context, ug *userv1.UserGroup){
		r.initStatus,
		r.syncOwnerUGUserBinding,
		r.syncFinalStatus,
	}

	for _, fn := range pipelines {
		fn(ctx, ug)
	}
	if ug.Status.Phase != userv1.UserUnknown {
		ug.Status.Phase = userv1.UserActive
	}
	err := r.updateStatus(ctx, client.ObjectKeyFromObject(obj), ug.Status.DeepCopy())
	if err != nil {
		r.Recorder.Eventf(ug, v1.EventTypeWarning, "SyncStatus", "Sync status %s is error: %v", ug.Name, err)
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *UserGroupReconciler) initStatus(ctx context.Context, ug *userv1.UserGroup) {
	var initializedCondition = userv1.Condition{
		Type:               userv1.Initialized,
		Status:             v1.ConditionTrue,
		Reason:             string(userv1.Initialized),
		Message:            "user group has been initialized",
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
	}
	ug.Status.Phase = userv1.UserPending
	ug.Status.ObservedGeneration = ug.Generation
	if !helper.IsConditionTrue(ug.Status.Conditions, initializedCondition) {
		ug.Status.Conditions = helper.UpdateCondition(ug.Status.Conditions, initializedCondition)
	}
}
func (r *UserGroupReconciler) syncFinalStatus(ctx context.Context, ug *userv1.UserGroup) {
	condition := &userv1.Condition{
		Type:               userv1.Ready,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "UserGroup is available now",
	}
	defer r.saveCondition(ug, condition)

	if !helper.IsConditionsTrue(ug.Status.Conditions) {
		condition.LastHeartbeatTime = metav1.Now()
		condition.Status = v1.ConditionFalse
		condition.Reason = "Not" + string(userv1.Ready)
		condition.Message = "UserGroup is not available now"
		ug.Status.Phase = userv1.UserUnknown
	} else {
		ug.Status.Phase = userv1.UserActive
	}
}

func (r *UserGroupReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status *userv1.UserGroupStatus) error {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &userv1.UserGroup{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status = *status
		if err := r.Client.Status().Update(ctx, original); err != nil {
			return err
		}
		return nil
	}); err != nil {
		return err
	}
	return nil
}

func (r *UserGroupReconciler) saveCondition(ug *userv1.UserGroup, condition *userv1.Condition) {
	if !helper.IsConditionTrue(ug.Status.Conditions, *condition) {
		ug.Status.Conditions = helper.UpdateCondition(ug.Status.Conditions, *condition)
	}
}

func (r *UserGroupReconciler) syncOwnerUGUserBinding(ctx context.Context, ug *userv1.UserGroup) {
	userConditionType := userv1.ConditionType("OwnerUGUserBindingSyncReady")
	condition := &userv1.Condition{
		Type:               userConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync owner ug user binding successfully",
	}
	defer r.saveCondition(ug, condition)

	userName := ug.Annotations[userAnnotationOwnerKey]

	uguBindingName := fmt.Sprintf("ugu-%s", userName)
	ugName := fmt.Sprintf("ug-%s", userName)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ugBinding := &userv1.UserGroupBinding{}
		ugBinding.Name = uguBindingName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ugBinding, func() error {
			if err = controllerutil.SetControllerReference(ug, ugBinding, r.Scheme); err != nil {
				return err
			}
			ugBinding.Annotations = map[string]string{userAnnotationOwnerKey: userName}
			ugBinding.UserGroupRef = ugName
			ugBinding.Subject = rbacv1.Subject{
				Kind:     "User",
				APIGroup: userv1.GroupVersion.Group,
				Name:     userName,
			}
			ugBinding.RoleRef = userv1.RoleRefTypeUser
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create user UserGroupBinding")
		}
		r.Logger.V(1).Info("create or update user UserGroupBinding", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncOwnerUGUserBindingError", err)
		r.Recorder.Eventf(ug, v1.EventTypeWarning, "syncOwnerUGUserBinding", "Sync OwnerUGUserBinding %s is error: %v", uguBindingName, err)
	}
}
