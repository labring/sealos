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
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/kubeconfig"

	"sigs.k8s.io/controller-runtime/pkg/ratelimiter"

	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/predicate"

	"github.com/labring/sealos/pkg/utils/hash"

	v12 "k8s.io/api/rbac/v1"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/source"

	"github.com/labring/sealos/controllers/user/controllers/migrate"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/client-go/rest"
	kubecontroller "sigs.k8s.io/controller-runtime/pkg/controller"

	"github.com/go-logr/logr"
	"github.com/labring/endpoints-operator/library/controller"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	v1 "k8s.io/api/core/v1"
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

type ReconcilerOptions struct {
	MaxConcurrentReconciles int
	RateLimiter             ratelimiter.RateLimiter
}

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

type ctxKey string

// +kubebuilder:rbac:groups=*,resources=*,verbs=*

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

	if ok, err := r.finalizer.RemoveFinalizer(ctx, user, func(ctx context.Context, obj client.Object) error {
		ns := &v1.Namespace{}
		ns.Name = config.GetUsersNamespace(user.Name)
		_ = r.Delete(ctx, ns)
		return nil
	}); ok {
		return ctrl.Result{}, err
	}

	if ok, err := r.finalizer.AddFinalizer(ctx, user); ok {
		if err != nil {
			return ctrl.Result{}, err
		}
		return r.reconcile(ctx, user)
	}
	return ctrl.Result{}, errors.New("reconcile error from Finalizer")
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserReconciler) SetupWithManager(mgr ctrl.Manager, opts ReconcilerOptions) error {
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
		For(&userv1.User{}, builder.WithPredicates(
			predicate.Or(predicate.GenerationChangedPredicate{}))).
		Watches(&source.Kind{Type: &v1.ServiceAccount{}}, owner).
		Watches(&source.Kind{Type: &v12.Role{}}, owner).
		Watches(&source.Kind{Type: &v12.RoleBinding{}}, owner).
		WithOptions(kubecontroller.Options{
			MaxConcurrentReconciles: opts.MaxConcurrentReconciles,
			RateLimiter:             opts.RateLimiter,
		}).
		Complete(r)
}

func (r *UserReconciler) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).Info("update reconcile controller user", "request", client.ObjectKeyFromObject(obj))
	user, ok := obj.(*userv1.User)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert user is error")
	}

	pipelines := []func(ctx context.Context, user *userv1.User) context.Context{
		r.initStatus,
		r.syncNamespace,
		r.syncServiceAccount,
		r.syncServiceAccountSecrets,
		r.syncKubeConfig,
		r.syncRole,
		r.syncRoleBinding,
		r.syncOwnerUG,
		r.syncOwnerUGNamespaceBinding,
		r.syncFinalStatus,
	}

	for _, fn := range pipelines {
		ctx = fn(ctx, user)
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

func (r *UserReconciler) initStatus(ctx context.Context, user *userv1.User) context.Context {
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
	return ctx
}

func (r *UserReconciler) syncNamespace(ctx context.Context, user *userv1.User) context.Context {
	namespaceConditionType := userv1.ConditionType("NamespaceSyncReady")
	nsCondition := &userv1.Condition{
		Type:               namespaceConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, nsCondition)
	defer func() {
		if helper.DiffCondition(condition, nsCondition) {
			r.saveCondition(user, nsCondition.DeepCopy())
		}
	}()
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		ns := &v1.Namespace{}
		ns.Name = config.GetUsersNamespace(user.Name)
		ns.Labels = map[string]string{}
		if err = r.Get(ctx, client.ObjectKeyFromObject(ns), ns); err != nil {
			if !apierrors.IsNotFound(err) {
				return err
			}
		}
		var isCreated bool
		if !ns.CreationTimestamp.IsZero() {
			isCreated = true
			r.Logger.V(1).Info("define namespace User namespace is created", "isCreated", isCreated, "namespace", ns.Name)
		}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ns, func() error {
			ns.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			ns.Labels = config.SetPodSecurity(ns.Labels)
			ns.SetOwnerReferences([]metav1.OwnerReference{})
			return controllerutil.SetControllerReference(user, ns, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace by User", "OperationResult", change)
		nsCondition.Message = fmt.Sprintf("sync namespace %s/%s successfully", ns.Name, ns.ResourceVersion)
		return nil
	}); err != nil {
		helper.SetConditionError(nsCondition, "SyncUserError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncUser", "Sync User namespace %s is error: %v", user.Name, err)
	}
	return ctx
}

func (r *UserReconciler) syncRole(ctx context.Context, user *userv1.User) context.Context {
	roleConditionType := userv1.ConditionType("RoleSyncReady")
	roleCondition := &userv1.Condition{
		Type:               roleConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace role successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, roleCondition)
	defer func() {
		if helper.DiffCondition(condition, roleCondition) {
			r.saveCondition(user, roleCondition.DeepCopy())
		}
	}()
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		role := &v12.Role{}
		role.Name = user.Name
		role.Namespace = config.GetUsersNamespace(user.Name)
		role.Labels = map[string]string{}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, role, func() error {
			role.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			role.Rules = config.GetUserRole()
			return controllerutil.SetControllerReference(user, role, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace role by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace role  by User", "OperationResult", change)
		roleCondition.Message = fmt.Sprintf("sync namespace role %s/%s successfully", role.Name, role.ResourceVersion)
		return nil
	}); err != nil {
		helper.SetConditionError(roleCondition, "SyncUserError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncUserRole", "Sync User namespace role %s is error: %v", user.Name, err)
	}
	return ctx
}
func (r *UserReconciler) syncRoleBinding(ctx context.Context, user *userv1.User) context.Context {
	roleBindingConditionType := userv1.ConditionType("RoleBindingSyncReady")
	rbCondition := &userv1.Condition{
		Type:               roleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace role binding successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, rbCondition)
	defer func() {
		if helper.DiffCondition(condition, rbCondition) {
			r.saveCondition(user, rbCondition.DeepCopy())
		}
	}()
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		roleBinding := &v12.RoleBinding{}
		roleBinding.Name = user.Name
		roleBinding.Namespace = config.GetUsersNamespace(user.Name)
		roleBinding.Labels = map[string]string{}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
			roleBinding.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			roleBinding.RoleRef = v12.RoleRef{
				APIGroup: v12.GroupName,
				Kind:     "Role",
				Name:     user.Name,
			}
			roleBinding.Subjects = config.GetNewUsersSubject(user.Name)
			return controllerutil.SetControllerReference(user, roleBinding, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace role binding by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace role binding by User", "OperationResult", change)
		rbCondition.Message = fmt.Sprintf("sync namespace role binding %s/%s successfully", roleBinding.Name, roleBinding.ResourceVersion)
		return nil
	}); err != nil {
		helper.SetConditionError(rbCondition, "SyncUserError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncUserRoleBinding", "Sync User namespace role binding %s is error: %v", user.Name, err)
	}
	return ctx
}
func (r *UserReconciler) saveCondition(user *userv1.User, condition *userv1.Condition) {
	user.Status.Conditions = helper.UpdateCondition(user.Status.Conditions, *condition)
}

func (r *UserReconciler) syncServiceAccount(ctx context.Context, user *userv1.User) context.Context {
	saConditionType := userv1.ConditionType("ServiceAccountSyncReady")
	saCondition := &userv1.Condition{
		Type:               saConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace sa successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, saCondition)
	defer func() {
		if helper.DiffCondition(condition, saCondition) {
			r.saveCondition(user, saCondition.DeepCopy())
		}
	}()
	ctx = context.WithValue(ctx, ctxKey("reNew"), false)
	sa := &v1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      user.Name,
			Namespace: config.GetDefaultNamespace(),
		},
	}
	_ = r.Delete(context.Background(), sa)
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		sa = &v1.ServiceAccount{}
		sa.Name = user.Name
		sa.Namespace = config.GetUsersNamespace(user.Name)
		sa.Labels = map[string]string{}
		if err = r.Get(context.Background(), client.ObjectKey{
			Namespace: config.GetUsersNamespace(user.Name),
			Name:      user.Name,
		}, sa); err != nil {
			if apierrors.IsNotFound(err) {
				ctx = context.WithValue(ctx, ctxKey("reNew"), true)
				r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "sa %s not found, kubeConfig renew", user.Name)
			}
		}
		secretName := kubeconfig.SecretName(user.Name)
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, sa, func() error {
			sa.Annotations = map[string]string{userAnnotationOwnerKey: user.Name}
			if len(sa.Secrets) == 0 {
				sa.Secrets = []v1.ObjectReference{
					{
						Name: secretName,
					},
				}
			}
			return controllerutil.SetControllerReference(user, sa, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace sa by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace sa by User", "OperationResult", change)
		if change == controllerutil.OperationResultCreated || change == controllerutil.OperationResultUpdated {
			ctx = context.WithValue(ctx, ctxKey("reNew"), true)
		}
		saCondition.Message = fmt.Sprintf("sync namespace sa %s/%s successfully", sa.Name, sa.ResourceVersion)
		return nil
	}); err != nil {
		helper.SetConditionError(saCondition, "SyncUserError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncUserServiceAccount", "Sync User namespace sa %s is error: %v", user.Name, err)
	}
	ctx = context.WithValue(ctx, ctxKey("serviceAccount"), sa)
	return ctx
}

func (r *UserReconciler) syncServiceAccountSecrets(ctx context.Context, user *userv1.User) context.Context {
	secretsConditionType := userv1.ConditionType("ServiceAccountSecretsSyncReady")
	secretsCondition := &userv1.Condition{
		Type:               secretsConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace secrets successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, secretsCondition)
	defer func() {
		if helper.DiffCondition(condition, secretsCondition) {
			r.saveCondition(user, secretsCondition.DeepCopy())
		}
	}()
	sa, ok := ctx.Value(ctxKey("serviceAccount")).(*v1.ServiceAccount)
	if !ok {
		helper.SetConditionError(secretsCondition, "SyncUserError", fmt.Errorf("syncServiceAccountSecrets serviceAccount not found"))
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync User namespace  syncServiceAccountSecrets %s is error: %v", user.Name, "serviceAccount not found")
		return ctx
	}

	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		secretName := sa.Secrets[0].Name
		secrets := &v1.Secret{}
		secrets.Name = secretName
		secrets.Namespace = config.GetUsersNamespace(user.Name)
		var err error
		if err = r.Get(ctx, client.ObjectKeyFromObject(secrets), secrets); err == nil {
			return nil
		}
		var change controllerutil.OperationResult
		if change, err = controllerutil.CreateOrUpdate(context.TODO(), r.Client, secrets, func() error {
			if secrets.Annotations == nil {
				secrets.Annotations = make(map[string]string, 0)
			}
			secrets.Type = v1.SecretTypeServiceAccountToken
			secrets.Annotations[v1.ServiceAccountNameKey] = sa.Name
			secrets.Annotations["sealos.io/user.expirationSeconds"] = strconv.Itoa(int(user.Spec.CSRExpirationSeconds))
			return controllerutil.SetControllerReference(user, secrets, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace sa secrets by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace sa secrets by User", "OperationResult", change)
		if change == controllerutil.OperationResultCreated || change == controllerutil.OperationResultUpdated {
			ctx = context.WithValue(ctx, ctxKey("reNew"), true)
		}
		secretsCondition.Message = fmt.Sprintf("sync namespace sa sercrets %s/%s successfully", secrets.Name, secrets.ResourceVersion)
		return nil
	}); err != nil {
		helper.SetConditionError(secretsCondition, "SyncUserError", err)
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncUserServiceAccount", "Sync User namespace sa %s is error: %v", user.Name, err)
	}
	return ctx
}

func (r *UserReconciler) syncKubeConfig(ctx context.Context, user *userv1.User) context.Context {
	userConditionType := userv1.ConditionType("KubeConfigSyncReady")
	userCondition := &userv1.Condition{
		Type:               userConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync kube config successfully",
	}
	condition := helper.GetCondition(user.Status.Conditions, userCondition)
	defer func() {
		if helper.DiffCondition(condition, userCondition) {
			r.saveCondition(user, userCondition.DeepCopy())
		}
	}()
	sa, ok := ctx.Value(ctxKey("serviceAccount")).(*v1.ServiceAccount)
	if !ok {
		helper.SetConditionError(userCondition, "SyncUserError", fmt.Errorf("serviceAccount not found"))
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync User namespace  kubeconfig %s is error: %v", user.Name, "serviceAccount not found")
		return ctx
	}
	cfg := kubeconfig.NewConfig(user.Name, "", user.Spec.CSRExpirationSeconds).WithServiceAccountConfig(config.GetUsersNamespace(user.Name), sa)
	var apiConfig *api.Config
	var err error
	apiConfig, event, err := syncReNewConfig(user)
	if event != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", *event)
	}
	user.Status.ObservedCSRExpirationSeconds = user.Spec.CSRExpirationSeconds
	if err != nil {
		r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "syncReNewConfig event %s is error: %v", user.Name, err)
		return ctx
	}
	if ok, val := ctx.Value(ctxKey("reNew")).(bool); ok {
		if val {
			apiConfig = nil
		}
	}
	if apiConfig == nil {
		apiConfig, err = cfg.Apply(r.config, r.Client)
		if err != nil {
			helper.SetConditionError(userCondition, "SyncKubeConfigError", err)
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync KubeConfig apply %s is error: %v", user.Name, err)
			return ctx
		}
		if apiConfig == nil {
			helper.SetConditionError(userCondition, "SyncKubeConfigError", errors.New("api.config is nil"))
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Sync KubeConfig apply %s is error: %v", user.Name, errors.New("api.config is nil"))
			return ctx
		}
		kubeData, err := clientcmd.Write(*apiConfig)
		if err != nil {
			helper.SetConditionError(userCondition, "OutputKubeConfigError", err)
			r.Recorder.Eventf(user, v1.EventTypeWarning, "syncKubeConfig", "Output KubeConfig apply %s is error: %v", user.Name, err)
			return ctx
		}
		user.Status.KubeConfig = string(kubeData)
		userCondition.Message = fmt.Sprintf("renew sync kube config successfully hash %s", hash.ToString(user.Status.KubeConfig))
	}
	return ctx
}

func syncReNewConfig(user *userv1.User) (*api.Config, *string, error) {
	var apiConfig *api.Config
	var err error
	var event *string
	if user.Status.KubeConfig != "" && user.Spec.CSRExpirationSeconds == user.Status.ObservedCSRExpirationSeconds {
		apiConfig, err = clientcmd.Load([]byte(user.Status.KubeConfig))
		if err != nil {
			return nil, nil, err
		}
		for _, ctx := range apiConfig.Contexts {
			if ctx.Namespace == "" {
				apiConfig = nil
				ev := fmt.Sprintf("User %s Namespace is empty", user.Name)
				event = &ev
				return apiConfig, event, err
			}
		}
		if info, ok := apiConfig.AuthInfos[user.Name]; ok {
			if info != nil {
				if info.Token == "" {
					apiConfig = nil
					ev := fmt.Sprintf("User %s Token is empty", user.Name)
					event = &ev
					return apiConfig, event, err
				}
				if info.ClientCertificateData == nil {
					return apiConfig, event, err
				}
				cert, err := kubeconfig.DecodeX509CertificateBytes(info.ClientCertificateData)
				if err != nil {
					return nil, nil, err
				}
				if cert.NotAfter.Before(time.Now()) {
					apiConfig = nil
					ev := fmt.Sprintf("ClientCertificateData %s is expired", user.Name)
					event = &ev
				}
			}
		}
	}
	return apiConfig, event, err
}

func (r *UserReconciler) syncOwnerUG(ctx context.Context, user *userv1.User) context.Context {
	userConditionType := userv1.ConditionType("OwnerUGSyncReady")
	user.Status.Conditions = helper.DeleteCondition(user.Status.Conditions, userConditionType)
	ug := &userv1.UserGroup{}
	err := r.Client.Get(ctx, types.NamespacedName{Name: fmt.Sprintf("ug-%s", user.Name)}, ug)
	if err == nil {
		migrate.SetOwner(ctx, r.Client, ug, nil)
		migrate.RemoveFinalizer(ctx, r.Client, ug, migrate.UGFinalizer)
	}
	return ctx
}

func (r *UserReconciler) syncOwnerUGNamespaceBinding(ctx context.Context, user *userv1.User) context.Context {
	userConditionType := userv1.ConditionType("OwnerUGNamespaceBindingSyncReady")
	user.Status.Conditions = helper.DeleteCondition(user.Status.Conditions, userConditionType)
	ugBinding := &userv1.UserGroupBinding{}
	err := r.Client.Get(ctx, types.NamespacedName{Name: fmt.Sprintf("ugn-%s", user.Name)}, ugBinding)
	if err == nil {
		migrate.SetOwner(ctx, r.Client, ugBinding, nil)
		migrate.RemoveFinalizer(ctx, r.Client, ugBinding, migrate.UGBindingFinalizer)
	}
	uguBinding := &userv1.UserGroupBinding{}
	err = r.Client.Get(ctx, types.NamespacedName{Name: fmt.Sprintf("ugu-%s", user.Name)}, uguBinding)
	if err == nil {
		migrate.RemoveFinalizer(ctx, r.Client, uguBinding, migrate.UGBindingFinalizer)
	}
	return ctx
}

func (r *UserReconciler) syncFinalStatus(ctx context.Context, user *userv1.User) context.Context {
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
	return ctx
}

func (r *UserReconciler) updateStatus(ctx context.Context, nn types.NamespacedName, status *userv1.UserStatus) error {
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		original := &userv1.User{}
		if err := r.Get(ctx, nn, original); err != nil {
			return err
		}
		original.Status = *status
		return r.Client.Status().Update(ctx, original)
	})
}
