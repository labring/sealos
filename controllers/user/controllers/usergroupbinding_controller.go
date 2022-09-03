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
	"github.com/labring/sealos/controllers/user/controllers/helper"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
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
	ctr := controller.Controller{
		Client:   r.Client,
		Logger:   r.Logger,
		Eventer:  r.Recorder,
		Operator: r,
		Gvk: schema.GroupVersionKind{
			Group:   userv1.GroupVersion.Group,
			Version: userv1.GroupVersion.Version,
			Kind:    "UserGroupBinding",
		},
		FinalizerName: "sealos.io/user.group.binding.finalizers",
	}
	userGroupBinding.APIVersion = ctr.Gvk.GroupVersion().String()
	userGroupBinding.Kind = ctr.Gvk.Kind
	return ctr.Run(ctx, req, userGroupBinding)
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

func (r *UserGroupBindingReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status *userv1.UserGroupBindingStatus) error {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &userv1.UserGroupBinding{}
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

func (r *UserGroupBindingReconciler) initStatus(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	var initializedCondition = userv1.Condition{
		Type:               userv1.Initialized,
		Status:             v1.ConditionTrue,
		Reason:             string(userv1.Initialized),
		Message:            "user group binding has been initialized",
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
	}
	ugBinding.Status.Phase = userv1.UserPending
	ugBinding.Status.ObservedGeneration = ugBinding.Generation
	if !helper.IsConditionTrue(ugBinding.Status.Conditions, initializedCondition) {
		ugBinding.Status.Conditions = helper.UpdateCondition(ugBinding.Status.Conditions, initializedCondition)
	}
}
func (r *UserGroupBindingReconciler) syncFinalStatus(ctx context.Context, ugBinding *userv1.UserGroupBinding) {
	condition := &userv1.Condition{
		Type:               userv1.Ready,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "UserGroupBinding is available now",
	}
	defer r.saveCondition(ugBinding, condition)

	if !helper.IsConditionsTrue(ugBinding.Status.Conditions) {
		condition.LastHeartbeatTime = metav1.Now()
		condition.Status = v1.ConditionFalse
		condition.Reason = "Not" + string(userv1.Ready)
		condition.Message = "UserGroupBinding is not available now"
		ugBinding.Status.Phase = userv1.UserUnknown
	} else {
		ugBinding.Status.Phase = userv1.UserActive
	}
}
func (r *UserGroupBindingReconciler) saveCondition(ugBinding *userv1.UserGroupBinding, condition *userv1.Condition) {
	if !helper.IsConditionTrue(ugBinding.Status.Conditions, *condition) {
		ugBinding.Status.Conditions = helper.UpdateCondition(ugBinding.Status.Conditions, *condition)
	}
}

func (r *UserGroupBindingReconciler) pipeline(ctx context.Context, ugBinding *userv1.UserGroupBinding, pipelines []func(ctx context.Context, ugBinding *userv1.UserGroupBinding)) error {
	for _, fn := range pipelines {
		fn(ctx, ugBinding)
	}
	if ugBinding.Status.Phase != userv1.UserUnknown {
		ugBinding.Status.Phase = userv1.UserActive
	}
	err := r.updateStatus(ctx, types.NamespacedName{Name: ugBinding.Name}, ugBinding.Status.DeepCopy())
	if err != nil {
		r.Recorder.Eventf(ugBinding, v1.EventTypeWarning, "SyncStatus", "Sync status %s is error: %v", ugBinding.Name, err)
		return err
	}
	return nil
}

func (r *UserGroupBindingReconciler) Delete(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) error {
	return NewUserGroupBindingController(ctx, req, r).Delete(ctx, req, gvk, obj)
}

func (r *UserGroupBindingReconciler) Update(ctx context.Context, req ctrl.Request, gvk schema.GroupVersionKind, obj client.Object) (ctrl.Result, error) {
	return NewUserGroupBindingController(ctx, req, r).Update(ctx, req, gvk, obj)
}

func NewUserGroupBindingController(ctx context.Context, req ctrl.Request, reconcile *UserGroupBindingReconciler) controller.Operator {
	ugBinding := &userv1.UserGroupBinding{}
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
