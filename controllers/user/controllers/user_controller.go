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
	"strings"
	"time"

	"github.com/go-logr/logr"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/finalizer"
	"github.com/labring/sealos/controllers/user/controllers/helper/hash"
	"github.com/labring/sealos/controllers/user/controllers/helper/kubeconfig"
	"github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
	"github.com/labring/sealos/controllers/user/pkg/licensegate"
	"github.com/labring/sealos/controllers/user/pkg/usercount"
	"golang.org/x/exp/rand"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	"sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	kubecontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	userAnnotationCreatorKey = userv1.UserAnnotationCreatorKey
	userAnnotationOwnerKey   = userv1.UserAnnotationOwnerKey
	userLabelOwnerKey        = userv1.UserLabelOwnerKey
	licenseLimitedCondition  = userv1.ConditionType("LicenseLimited")
)

// UserReconciler reconciles a User object
type UserReconciler struct {
	Logger      logr.Logger
	Recorder    record.EventRecorder
	cache       cache.Cache
	userCounter *usercount.Counter
	config      *rest.Config
	*runtime.Scheme
	client.Client
	finalizer          *finalizer.Finalizer
	minRequeueDuration time.Duration
	maxRequeueDuration time.Duration
}

type userReconcileState struct {
	serviceAccount          *v1.ServiceAccount
	tokenExpirationDeadline *metav1.Time
	currentSecretName       string
	cleanupLegacySecrets    bool
}

// +kubebuilder:rbac:groups=*,resources=*,verbs=*
// +kubebuilder:rbac:groups="",resources=serviceaccounts/token,verbs=create

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

	if ok, err := r.finalizer.RemoveFinalizer(
		ctx,
		user,
		func(ctx context.Context, obj client.Object) error {
			ns := &v1.Namespace{}
			ns.Name = config.GetUsersNamespace(user.Name)
			_ = r.Delete(ctx, ns)
			return nil
		},
	); ok {
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

type ControllerRestartPredicate struct {
	predicate.Funcs
	duration  time.Duration
	checkTime time.Time
}

type OwnerAnnotationChangedPredicate struct {
	predicate.Funcs
}

func (OwnerAnnotationChangedPredicate) Update(e event.UpdateEvent) bool {
	return e.ObjectOld.GetAnnotations()[userAnnotationOwnerKey] !=
		e.ObjectNew.GetAnnotations()[userAnnotationOwnerKey]
}

func NewControllerRestartPredicate(duration time.Duration) *ControllerRestartPredicate {
	return &ControllerRestartPredicate{
		checkTime: time.Now().Add(-duration),
		duration:  duration,
	}
}

// skip create event p.duration ago
func (p *ControllerRestartPredicate) Create(e event.CreateEvent) bool {
	return e.Object.GetCreationTimestamp().After(p.checkTime)
}

// SetupWithManager sets up the controller with the Manager.
func (r *UserReconciler) SetupWithManager(mgr ctrl.Manager, opts ratelimiter.RateLimiterOptions,
	minRequeueDuration, maxRequeueDuration, restartPredicateDuration time.Duration,
	userCounter *usercount.Counter,
) error {
	const controllerName = "user_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = finalizer.NewFinalizer(r.Client, "sealos.io/user.finalizers").
			WithReader(mgr.GetAPIReader())
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.userCounter = userCounter
	r.config = mgr.GetConfig()
	r.Logger.V(1).Info("init reconcile controller user")
	r.minRequeueDuration = minRequeueDuration
	r.maxRequeueDuration = maxRequeueDuration

	if err := mgr.GetFieldIndexer().IndexField(
		context.Background(),
		&v1.Secret{},
		v1.ServiceAccountNameKey,
		func(rawObj client.Object) []string {
			secret, ok := rawObj.(*v1.Secret)
			if !ok || secret.Annotations == nil {
				return nil
			}
			value := secret.Annotations[v1.ServiceAccountNameKey]
			if value == "" {
				return nil
			}
			return []string{value}
		},
	); err != nil {
		return err
	}

	ownerEventHandler := handler.EnqueueRequestForOwner(
		r.Scheme,
		r.RESTMapper(),
		&userv1.User{},
		handler.OnlyControllerOwner(),
	)

	return ctrl.NewControllerManagedBy(mgr).
		For(
			&userv1.User{},
			builder.WithPredicates(predicate.Or(
				predicate.GenerationChangedPredicate{},
				OwnerAnnotationChangedPredicate{},
			)),
		).
		Watches(
			&licensev1.License{},
			handler.EnqueueRequestsFromMapFunc(r.licenseToUserRequests),
			builder.OnlyMetadata,
		).
		Watches(&rbacv1.Role{}, ownerEventHandler, builder.OnlyMetadata).
		Watches(&rbacv1.RoleBinding{}, ownerEventHandler, builder.OnlyMetadata).
		Watches(&v1.ServiceAccount{}, ownerEventHandler, builder.OnlyMetadata).
		WithOptions(kubecontroller.Options{
			MaxConcurrentReconciles: ratelimiter.GetConcurrent(opts),
			RateLimiter:             ratelimiter.GetRateLimiter(opts),
		}).
		WithEventFilter(NewControllerRestartPredicate(restartPredicateDuration)).
		Complete(r)
}

func (r *UserReconciler) reconcile(ctx context.Context, obj client.Object) (ctrl.Result, error) {
	r.Logger.V(1).
		Info("update reconcile controller user", "request", client.ObjectKeyFromObject(obj))
	startTime := time.Now()

	user, ok := obj.(*userv1.User)
	if !ok {
		return ctrl.Result{}, errors.New("obj convert user is error")
	}

	originalStatus := user.Status.DeepCopy()
	blocked, err := r.handleLicenseLimit(ctx, user, originalStatus)
	if err != nil {
		return ctrl.Result{}, err
	}
	if blocked {
		return ctrl.Result{RequeueAfter: r.minRequeueDuration}, nil
	}

	defer func() {
		r.Logger.V(1).
			Info("finished reconcile", "user info", user.Name, "create time", user.CreationTimestamp, "reconcile cost time", time.Since(startTime))
	}()

	state := &userReconcileState{}
	pipelines := []func(ctx context.Context, user *userv1.User, state *userReconcileState){
		r.initStatus,
		r.syncNamespace,
		r.syncServiceAccount,
		r.syncKubeConfig,
		r.syncRole,
		r.syncRoleBinding,
		r.syncClusterRoleBinding,
		r.syncFinalStatus,
	}

	for _, fn := range pipelines {
		fn(ctx, user, state)
	}
	if user.Status.Phase != userv1.UserUnknown {
		user.Status.Phase = userv1.UserActive
	}
	if state.cleanupLegacySecrets {
		// Best-effort migration cleanup for legacy service-account-token secrets.
		if err := kubeconfig.CleanupLegacyBoundTokenSecrets(
			ctx,
			r.cache,
			r.Client,
			user.Name,
			state.currentSecretName,
		); err != nil {
			r.Recorder.Eventf(
				user,
				v1.EventTypeWarning,
				"CleanupLegacyBoundTokenSecrets",
				"Cleanup stale bound token secrets for %s is error: %v",
				user.Name,
				err,
			)
			r.Logger.Error(err, "cleanup stale bound token secrets", "user", user.Name)
		}
	}
	err = r.updateStatus(ctx, user, originalStatus)
	if err != nil {
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"SyncStatus",
			"Sync status %s is error: %v",
			user.Name,
			err,
		)
		return ctrl.Result{}, err
	}
	return ctrl.Result{
		RequeueAfter: r.nextRequeueDuration(state),
	}, nil
}

func (r *UserReconciler) initStatus(_ context.Context, user *userv1.User, _ *userReconcileState) {
	initializedCondition := userv1.Condition{
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
		user.Status.Conditions = helper.UpdateCondition(
			user.Status.Conditions,
			initializedCondition,
		)
	}
}

func (r *UserReconciler) syncNamespace(
	ctx context.Context,
	user *userv1.User,
	_ *userReconcileState,
) {
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
		if err = r.Get(ctx, client.ObjectKeyFromObject(ns), ns); err != nil {
			if !apierrors.IsNotFound(err) {
				return err
			}
		}
		var isCreated bool
		if !ns.CreationTimestamp.IsZero() {
			isCreated = true
			r.Logger.V(1).
				Info("define namespace User namespace is created", "isCreated", isCreated, "namespace", ns.Name)
		}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, ns, func() error {
			if ns.Annotations == nil {
				ns.Annotations = make(map[string]string)
			}
			if ns.Labels == nil {
				ns.Labels = make(map[string]string)
			}
			ns.Annotations[userAnnotationCreatorKey] = user.Name
			ns.Annotations[userAnnotationOwnerKey] = user.Annotations[userAnnotationOwnerKey]
			if ns.Name != "ns-admin" {
				ns.Labels = config.SetPodSecurity(ns.Labels)
			} else {
				for k := range ns.Labels {
					if strings.HasPrefix(k, "pod-security.") {
						delete(ns.Labels, k)
					}
				}
			}
			// add label for namespace to filter
			ns.Labels[userLabelOwnerKey] = user.Annotations[userAnnotationOwnerKey]
			ns.SetOwnerReferences([]metav1.OwnerReference{})
			return controllerutil.SetControllerReference(user, ns, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace by User", "OperationResult", change)
		nsCondition.Message = fmt.Sprintf(
			"sync namespace %s/%s successfully",
			ns.Name,
			ns.ResourceVersion,
		)
		return nil
	}); err != nil {
		helper.SetConditionError(nsCondition, "SyncUserError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncUser",
			"Sync User namespace %s is error: %v",
			user.Name,
			err,
		)
	}
}

func (r *UserReconciler) syncRole(ctx context.Context, user *userv1.User, _ *userReconcileState) {
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
	// create three roles
	r.createRole(ctx, roleCondition, user, userv1.OwnerRoleType)
	r.createRole(ctx, roleCondition, user, userv1.ManagerRoleType)
	r.createRole(ctx, roleCondition, user, userv1.DeveloperRoleType)
}

func (r *UserReconciler) createRole(
	ctx context.Context,
	condition *userv1.Condition,
	user *userv1.User,
	roleType userv1.RoleType,
) {
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		role := &rbacv1.Role{}
		role.Name = string(roleType)
		role.Namespace = config.GetUsersNamespace(user.Name)
		role.Labels = map[string]string{}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, role, func() error {
			role.Annotations = map[string]string{
				userAnnotationCreatorKey: user.Name,
				userAnnotationOwnerKey:   user.Annotations[userAnnotationOwnerKey],
			}
			role.Rules = config.GetUserRole(roleType)
			return controllerutil.SetControllerReference(user, role, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace role by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace role  by User", "OperationResult", change)
		condition.Message = fmt.Sprintf(
			"sync namespace role %s/%s successfully",
			role.Name,
			role.ResourceVersion,
		)
		return nil
	}); err != nil {
		helper.SetConditionError(condition, "SyncUserError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncUserRole",
			"Sync User namespace role %s is error: %v",
			user.Name,
			err,
		)
	}
}

func (r *UserReconciler) syncRoleBinding(
	ctx context.Context,
	user *userv1.User,
	_ *userReconcileState,
) {
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
		roleBinding := &rbacv1.RoleBinding{}
		roleBinding.Name = user.Name
		roleBinding.Namespace = config.GetUsersNamespace(user.Name)
		roleBinding.Labels = map[string]string{}
		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, roleBinding, func() error {
			roleBinding.Annotations = map[string]string{
				userAnnotationCreatorKey: user.Name,
				userAnnotationOwnerKey:   user.Annotations[userAnnotationOwnerKey],
			}
			roleBinding.RoleRef = rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "Role",
				Name:     string(userv1.OwnerRoleType),
			}
			roleBinding.Subjects = config.GetUsersSubject(user.Name)
			return controllerutil.SetControllerReference(user, roleBinding, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace role binding by User: %w", err)
		}
		r.Logger.V(1).
			Info("create or update namespace role binding by User", "OperationResult", change)
		rbCondition.Message = fmt.Sprintf(
			"sync namespace role binding %s/%s successfully",
			roleBinding.Name,
			roleBinding.ResourceVersion,
		)
		return nil
	}); err != nil {
		helper.SetConditionError(rbCondition, "SyncUserError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncUserRoleBinding",
			"Sync User namespace role binding %s is error: %v",
			user.Name,
			err,
		)
	}
}

func (r *UserReconciler) syncClusterRoleBinding(
	ctx context.Context,
	user *userv1.User,
	_ *userReconcileState,
) {
	if user.Name != "admin" {
		return
	}
	roleBindingConditionType := userv1.ConditionType("ClusterRoleBindingSyncReady")
	rbCondition := &userv1.Condition{
		Type:               roleBindingConditionType,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync admin role binding successfully",
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
		clusterRoleBinding := &rbacv1.ClusterRoleBinding{}
		clusterRoleBinding.Name = "sealos-cloud" + user.Name
		clusterRoleBinding.Labels = map[string]string{}
		if change, err = controllerutil.CreateOrUpdate(
			ctx,
			r.Client,
			clusterRoleBinding,
			func() error {
				clusterRoleBinding.Annotations = map[string]string{
					userAnnotationCreatorKey: user.Name,
					userAnnotationOwnerKey:   user.Annotations[userAnnotationOwnerKey],
				}
				clusterRoleBinding.RoleRef = rbacv1.RoleRef{
					APIGroup: rbacv1.GroupName,
					Kind:     "ClusterRole",
					Name:     "cluster-admin",
				}
				clusterRoleBinding.Subjects = config.GetUsersSubject(user.Name)
				return controllerutil.SetControllerReference(user, clusterRoleBinding, r.Scheme)
			},
		); err != nil {
			return fmt.Errorf(
				"unable to create namespace admin cluster role binding by User: %w",
				err,
			)
		}
		r.Logger.V(1).
			Info("create or update namespace admin cluster role binding by User", "OperationResult", change)
		rbCondition.Message = fmt.Sprintf(
			"sync namespace admin cluster role binding %s/%s successfully",
			clusterRoleBinding.Name,
			clusterRoleBinding.ResourceVersion,
		)
		return nil
	}); err != nil {
		helper.SetConditionError(rbCondition, "SyncUserError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncUserClusterRoleBinding",
			"Sync User admin cluster role binding %s is error: %v",
			user.Name,
			err,
		)
	}
}

func (r *UserReconciler) saveCondition(user *userv1.User, condition *userv1.Condition) {
	user.Status.Conditions = helper.UpdateCondition(user.Status.Conditions, *condition)
}

func (r *UserReconciler) syncServiceAccount(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
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
	state.serviceAccount = nil
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		sa := &v1.ServiceAccount{}
		sa.Name = user.Name
		sa.Namespace = config.GetUserSystemNamespace()
		sa.Labels = map[string]string{}

		if err = r.Get(ctx, client.ObjectKey{
			Namespace: config.GetUserSystemNamespace(),
			Name:      user.Name,
		}, sa); err != nil && !apierrors.IsNotFound(err) {
			return err
		}

		if change, err = controllerutil.CreateOrUpdate(ctx, r.Client, sa, func() error {
			sa.Annotations = map[string]string{
				userAnnotationCreatorKey: user.Name,
				userAnnotationOwnerKey:   user.Annotations[userAnnotationOwnerKey],
			}
			return controllerutil.SetControllerReference(user, sa, r.Scheme)
		}); err != nil {
			return fmt.Errorf("unable to create namespace sa by User: %w", err)
		}
		r.Logger.V(1).Info("create or update namespace sa by User", "OperationResult", change)
		saCondition.Message = fmt.Sprintf(
			"sync namespace sa %s/%s successfully",
			sa.Name,
			sa.ResourceVersion,
		)
		state.serviceAccount = sa
		return nil
	}); err != nil {
		helper.SetConditionError(saCondition, "SyncUserError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncUserServiceAccount",
			"Sync User namespace sa %s is error: %v",
			user.Name,
			err,
		)
	}
}

func (r *UserReconciler) syncKubeConfig(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
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
	sa := state.serviceAccount
	if sa == nil {
		helper.SetConditionError(
			userCondition,
			"SyncUserError",
			errors.New("serviceAccount not found"),
		)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Sync User namespace  kubeconfig %s is error: %v",
			user.Name,
			"serviceAccount not found",
		)
		return
	}
	user.Status.ObservedCSRExpirationSeconds = user.Spec.CSRExpirationSeconds
	if r.shouldRotateKubeConfig(user) {
		if err := r.deleteBoundTokenSecret(ctx, user); err != nil {
			helper.SetConditionError(userCondition, "SyncKubeConfigError", err)
			r.Recorder.Eventf(
				user,
				v1.EventTypeWarning,
				"syncKubeConfig",
				"Delete bound token secret %s is error: %v",
				user.Name,
				err,
			)
			return
		}
	}
	tokenRequestConfig := kubeconfig.NewConfig(user.Name, "", user.Spec.CSRExpirationSeconds).
		WithServiceAccountConfig(config.GetUserSystemNamespace(), sa)
	if r.shouldRotateKubeConfig(user) {
		tokenRequestConfig = tokenRequestConfig.WithForceNewSecret()
	}
	apiConfig, tokenExpiresAt, err := tokenRequestConfig.ApplyWithTokenRequest(
		ctx,
		r.config,
		r.Client,
	)
	if err != nil {
		helper.SetConditionError(userCondition, "SyncKubeConfigError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Sync KubeConfig apply %s is error: %v",
			user.Name,
			err,
		)
		return
	}
	if apiConfig == nil {
		helper.SetConditionError(
			userCondition,
			"SyncKubeConfigError",
			errors.New("api.config is nil"),
		)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Sync KubeConfig apply %s is error: %v",
			user.Name,
			errors.New("api.config is nil"),
		)
		return
	}
	state.tokenExpirationDeadline = &tokenExpiresAt
	if r.shouldRotateKubeConfig(user) {
		user.Status.ObservedKubeConfigRotateAt = user.Spec.KubeConfigRotateAt
	}
	kubeData, err := clientcmd.Write(*apiConfig)
	if err != nil {
		helper.SetConditionError(userCondition, "OutputKubeConfigError", err)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Output KubeConfig apply %s is error: %v",
			user.Name,
			err,
		)
		return
	}
	user.Status.KubeConfig = string(kubeData)
	userCondition.Message = "renew sync kube config successfully hash " + hash.HashToString(
		user.Status.KubeConfig,
	)
	keepSecretName := ""
	if len(sa.Secrets) > 0 {
		keepSecretName = sa.Secrets[0].Name
	}
	state.currentSecretName = keepSecretName
	state.cleanupLegacySecrets = keepSecretName != ""
}

func (r *UserReconciler) deleteBoundTokenSecret(ctx context.Context, user *userv1.User) error {
	secretName := kubeconfig.TokenSecretName(user.Name)
	sa := &v1.ServiceAccount{}
	if err := r.Get(ctx, client.ObjectKey{
		Namespace: config.GetUserSystemNamespace(),
		Name:      user.Name,
	}, sa); err != nil {
		if !apierrors.IsNotFound(err) {
			return fmt.Errorf("failed to get service account for bound token secret: %w", err)
		}
	} else if len(sa.Secrets) > 0 && sa.Secrets[0].Name != "" {
		secretName = sa.Secrets[0].Name
	}

	secret := &v1.Secret{}
	secret.Name = secretName
	secret.Namespace = config.GetUserSystemNamespace()
	if err := r.Delete(ctx, secret); err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("failed to delete bound token secret: %w", err)
	}
	return nil
}

func syncReNewConfig(user *userv1.User) (*api.Config, *string, error) {
	var apiConfig *api.Config
	var err error
	var event *string
	if user.Status.KubeConfig != "" &&
		user.Spec.CSRExpirationSeconds == user.Status.ObservedCSRExpirationSeconds {
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

func (r *UserReconciler) syncFinalStatus(
	_ context.Context,
	user *userv1.User,
	_ *userReconcileState,
) {
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

func (r *UserReconciler) shouldRotateKubeConfig(user *userv1.User) bool {
	if user.Spec.KubeConfigRotateAt == nil {
		return false
	}
	if user.Status.ObservedKubeConfigRotateAt == nil {
		return true
	}
	return !user.Spec.KubeConfigRotateAt.Equal(user.Status.ObservedKubeConfigRotateAt)
}

func (r *UserReconciler) updateStatus(
	ctx context.Context,
	user *userv1.User,
	originalStatus *userv1.UserStatus,
) error {
	original := user.DeepCopy()
	original.Status = *originalStatus.DeepCopy()
	return r.Client.Status().Patch(ctx, user, client.MergeFrom(original))
}

func (r *UserReconciler) handleLicenseLimit(
	ctx context.Context,
	user *userv1.User,
	originalStatus *userv1.UserStatus,
) (bool, error) {
	if !r.isNewUser(user) {
		user.Status.Conditions = helper.DeleteCondition(
			user.Status.Conditions,
			licenseLimitedCondition,
		)
		return false, nil
	}

	if r.userCounter == nil || !r.userCounter.Initialized() {
		return false, errors.New("user count cache is not initialized")
	}
	userCount := r.userCounter.CountExcluding(user.Name)
	if licensegate.AllowNewUser(userCount) {
		user.Status.Conditions = helper.DeleteCondition(
			user.Status.Conditions,
			licenseLimitedCondition,
		)
		return false, nil
	}
	limitCondition := &userv1.Condition{
		Type:               licenseLimitedCondition,
		Status:             v1.ConditionFalse,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             "LicenseLimitExceeded",
		Message:            licensegate.LimitMessage(),
	}
	user.Status.Phase = userv1.UserPending
	user.Status.Conditions = helper.UpdateCondition(user.Status.Conditions, *limitCondition)
	if err := r.updateStatus(
		ctx,
		user,
		originalStatus,
	); err != nil {
		return false, err
	}
	r.Recorder.Eventf(
		user,
		v1.EventTypeWarning,
		"LicenseLimitExceeded",
		"%s: %d",
		licensegate.LimitMessage(),
		licensegate.UserLimit(),
	)
	return true, nil
}

func (r *UserReconciler) isNewUser(user *userv1.User) bool {
	return user.Status.ObservedGeneration == 0 && len(user.Status.Conditions) == 0
}

func (r *UserReconciler) nextRequeueDuration(state *userReconcileState) time.Duration {
	duration := RandTimeDurationBetween(r.minRequeueDuration, r.maxRequeueDuration)
	if state == nil ||
		state.tokenExpirationDeadline == nil ||
		state.tokenExpirationDeadline.IsZero() {
		return duration
	}
	tokenRefreshDuration := time.Until(state.tokenExpirationDeadline.Time) * 8 / 10
	if tokenRefreshDuration <= 0 {
		return time.Second
	}
	if tokenRefreshDuration < duration {
		return tokenRefreshDuration
	}
	return duration
}

func (r *UserReconciler) licenseToUserRequests(
	ctx context.Context,
	obj client.Object,
) []ctrl.Request {
	userList := &userv1.UserList{}
	if err := r.cache.List(ctx, userList); err != nil {
		r.Logger.Error(err, "list users for license change failed")
		return nil
	}
	requests := make([]ctrl.Request, 0, len(userList.Items))
	for i := range userList.Items {
		requests = append(
			requests,
			ctrl.Request{NamespacedName: client.ObjectKeyFromObject(&userList.Items[i])},
		)
	}
	return requests
}

// RandTimeDurationBetween get a random time duration between minDuration and maxDuration
func RandTimeDurationBetween(minDuration, maxDuration time.Duration) time.Duration {
	if minDuration >= maxDuration {
		return minDuration
	}
	minInNano := minDuration.Nanoseconds()
	maxInNano := maxDuration.Nanoseconds()
	randDurationInNano := rand.Int63n(maxInNano-minInNano) + minInNano
	return time.Duration(randDurationInNano) * time.Nanosecond
}
