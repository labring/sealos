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
	"time"

	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"k8s.io/client-go/rest"

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

var userAnnotationOwnerKey = userv1.UserAnnotationOwnerKey

const clusterRoleByCreate = "sealos-user-create-role"

const clusterRoleByManager = "sealos-user-manager-role"
const clusterRoleByUser = "sealos-user-user-role"

const roleNamespaceByUser = "cluster-admin"

// UserReconciler reconciles a User object
type UserReconciler struct {
	Logger   logr.Logger
	Recorder record.EventRecorder
	cache    cache.Cache
	config   *rest.Config
	*runtime.Scheme
	client.Client
	finalizer *controller.Finalizer
}

//+kubebuilder:rbac:groups=user.sealos.io,resources=users,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=user.sealos.io,resources=users/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=user.sealos.io,resources=users/finalizers,verbs=update
//+kubebuilder:rbac:groups=certificates.k8s.io,resources=certificatesigningrequests,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=certificates.k8s.io,resources=certificatesigningrequests/status,verbs=get;update;patch
//+kubebuilder:rbac:groups=certificates.k8s.io,resources=certificatesigningrequests/approval,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=certificates.k8s.io,resources=signers,verbs=approve,resourceNames=kubernetes.io/kube-apiserver-client
//+kubebuilder:rbac:groups=core,resources=serviceaccounts,verbs=get;list;watch;create;update;patch;delete
//+kubebuilder:rbac:groups=core,resources=serviceaccounts/status,verbs=get;update;patch

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
// TODO(user): Modify the Reconcile function to compare the state specified by
// the User object against the actual cluster state, and then
// perform operations to make the cluster state reflect the state specified by
// the user.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *UserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for users")
	user := &userv1.User{}
	if err := r.Get(ctx, req.NamespacedName, user); err != nil {
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(ctx, user, controller.DefaultFunc); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, user); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.doReconcile(ctx, user)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserReconciler) SetupWithManager(mgr ctrl.Manager) error {
	const controllerName = "user_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = controller.NewFinalizer(r.Client, "sealos.io/user.finalizers")
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.config = mgr.GetConfig()
	r.Logger.V(1).Info("init reconcile controller user")
	owner := &handler.EnqueueRequestForOwner{OwnerType: &userv1.User{}, IsController: true}
	return ctrl.NewControllerManagedBy(mgr).
		For(&userv1.User{}).
		Watches(&source.Kind{Type: &userv1.UserGroup{}}, owner).
		Watches(&source.Kind{Type: &userv1.UserGroupBinding{}}, owner).
		Complete(r)
}

func (r *UserReconciler) doReconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller user", "request", client.ObjectKeyFromObject(obj))
	user, ok := obj.(*userv1.User)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert user is error")
	}

	pipelines := []func(ctx context.Context, user *userv1.User){
		r.initStatus,
		r.syncKubeConfig,
		r.syncOwnerUG,
		r.syncOwnerUGNamespaceBinding,
		r.syncFinalStatus,
	}

	for _, fn := range pipelines {
		fn(ctx, user)
	}
	if user.Status.Phase != userv1.UserUnknown {
		user.Status.Phase = userv1.UserActive
	}
	err := r.updateStatus(ctx, client.ObjectKeyFromObject(obj), user.Status.DeepCopy())
	if err != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "SyncStatus", "Sync status %s is error: %v", user.Name, err)
		return ctrl.Result{}, err
	}
	return ctrl.Result{}, nil
}

func (r *UserReconciler) initStatus(ctx context.Context, user *userv1.User) {
	var initializedCondition = userv1.Condition{
		Type:               userv1.Initialized,
		Status:             v1.ConditionTrue,
		Reason:             string(userv1.Initialized),
		Message:            "user has been initialized",
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
	}
	user.Status.Phase = userv1.UserPending
	user.Status.ObservedGeneration = user.Generation
	if !helper.IsConditionTrue(user.Status.Conditions, initializedCondition) {
		user.Status.Conditions = helper.UpdateCondition(user.Status.Conditions, initializedCondition)
	}
}
func (r *UserReconciler) saveCondition(user *userv1.User, condition *userv1.Condition) {
	if !helper.IsConditionTrue(user.Status.Conditions, *condition) {
		user.Status.Conditions = helper.UpdateCondition(user.Status.Conditions, *condition)
	}
}

func (r *UserReconciler) syncKubeConfig(ctx context.Context, user *userv1.User) {
	cfg := &helper.Config{
		User:                    user.Name,
		ExpirationSeconds:       user.Spec.CSRExpirationSeconds,
		ServiceAccount:          true,
		ServiceAccountNamespace: helper.GetDefaultNamespace(),
	}
	userConditionType := userv1.ConditionType("KubeConfigSyncReady")
	condition := &userv1.Condition{
		Type:               userConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync kube config successfully",
	}
	defer r.saveCondition(user, condition)
	var config *api.Config
	var err error
	config, event, err := syncReNewConfig(user)
	if event != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", *event)
	}
	user.Status.ObservedCSRExpirationSeconds = user.Spec.CSRExpirationSeconds
	if err != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "syncReNewConfig %s is error: %v", user.Name, err)
		return
	}
	if config == nil {
		config, err = helper.NewGenerate(cfg).KubeConfig(r.config, r.Client)
		if err != nil {
			helper.SetConditionError(condition, "SyncKubeConfigError", err)
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync KubeConfig %s is error: %v", user.Name, err)
			return
		}
		if config == nil {
			helper.SetConditionError(condition, "SyncKubeConfigError", errors.New("api.config is nil"))
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync KubeConfig %s is error: %v", user.Name, errors.New("api.config is nil"))
			return
		}
		kubeData, err := clientcmd.Write(*config)
		if err != nil {
			helper.SetConditionError(condition, "OutputKubeConfigError", err)
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Output KubeConfig %s is error: %v", user.Name, err)
			return
		}
		user.Status.KubeConfig = string(kubeData)
	}
}

func syncReNewConfig(user *userv1.User) (*api.Config, *string, error) {
	var config *api.Config
	var err error
	var event *string
	if user.Status.KubeConfig != "" && user.Spec.CSRExpirationSeconds == user.Status.ObservedCSRExpirationSeconds {
		config, err = clientcmd.Load([]byte(user.Status.KubeConfig))
		if err != nil {
			return nil, nil, err
		}
		for _, ctx := range config.Contexts {
			if ctx.Namespace == "" {
				config = nil
				ev := fmt.Sprintf("User %s Namespace is empty", user.Name)
				event = &ev
				return config, event, err
			}
		}
		if info, ok := config.AuthInfos[user.Name]; ok {
			if info != nil {
				if info.Token == "" {
					config = nil
					ev := fmt.Sprintf("User %s Token is empty", user.Name)
					event = &ev
					return config, event, err
				}
				if info.ClientCertificateData == nil {
					return config, event, err
				}
				cert, err := helper.DecodeX509CertificateBytes(info.ClientCertificateData)
				if err != nil {
					return nil, nil, err
				}
				if cert.NotAfter.Before(time.Now()) {
					config = nil
					ev := fmt.Sprintf("ClientCertificateData %s is expired", user.Name)
					event = &ev
				}
			}
		}
	}
	return config, event, err
}

func (r *UserReconciler) syncOwnerUG(ctx context.Context, user *userv1.User) {
	userConditionType := userv1.ConditionType("OwnerUGSyncReady")
	condition := &userv1.Condition{
		Type:               userConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync owner ug successfully",
	}
	defer r.saveCondition(user, condition)

	ugName := fmt.Sprintf("ug-%s", user.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ug := &userv1.UserGroup{}
		ug.Name = ugName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ug, func() error {
			if err = controllerutil.SetControllerReference(user, ug, r.Scheme); err != nil {
				return err
			}
			ug.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create UserGroup")
		}
		r.Logger.V(1).Info("create or update UserGroup ", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncOwnerUGError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncOwnerUG", "Sync OwnerUG %s is error: %v", ugName, err)
	}
}

func (r *UserReconciler) syncOwnerUGNamespaceBinding(ctx context.Context, user *userv1.User) {
	userConditionType := userv1.ConditionType("OwnerUGNamespaceBindingSyncReady")
	condition := &userv1.Condition{
		Type:               userConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync owner ug namespace binding successfully",
	}
	defer r.saveCondition(user, condition)

	ugnBindingName := fmt.Sprintf("ugn-%s", user.Name)
	nsName := fmt.Sprintf("ns-%s", user.Name)
	ugName := fmt.Sprintf("ug-%s", user.Name)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ugBinding := &userv1.UserGroupBinding{}
		ugBinding.Name = ugnBindingName
		var change controllerutil.OperationResult
		var err error
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ugBinding, func() error {
			if err = controllerutil.SetControllerReference(user, ugBinding, r.Scheme); err != nil {
				return err
			}
			ugBinding.UserGroupRef = ugName
			ugBinding.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			ugBinding.Subject = rbacv1.Subject{
				Kind: "Namespace",
				Name: nsName,
			}
			return nil
		}); err != nil {
			return errors.Wrap(err, "unable to create namespace UserGroupBinding")
		}
		r.Logger.V(1).Info("create or update namespace UserGroupBinding", "OperationResult", change)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncOwnerUGNamespaceBindingError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncOwnerUGNamespaceBinding", "Sync OwnerUGNamespaceBinding %s is error: %v", ugnBindingName, err)
	}
}

func (r *UserReconciler) syncFinalStatus(ctx context.Context, user *userv1.User) {
	condition := &userv1.Condition{
		Type:               userv1.Ready,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "User is available now",
	}
	defer r.saveCondition(user, condition)

	if !helper.IsConditionsTrue(user.Status.Conditions) {
		condition.LastHeartbeatTime = metav1.Now()
		condition.Status = v1.ConditionFalse
		condition.Reason = "Not" + string(userv1.Ready)
		condition.Message = "User is not available now"
		user.Status.Phase = userv1.UserUnknown
	} else {
		user.Status.Phase = userv1.UserActive
	}
}

func (r *UserReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status *userv1.UserStatus) error {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &userv1.User{}
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
