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
	"maps"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/go-logr/logr"
	licensev1 "github.com/labring/sealos/controllers/license/api/v1"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	usercache "github.com/labring/sealos/controllers/user/controllers/cache"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/finalizer"
	"github.com/labring/sealos/controllers/user/controllers/helper/hash"
	"github.com/labring/sealos/controllers/user/controllers/helper/kubeconfig"
	"github.com/labring/sealos/controllers/user/controllers/helper/ratelimiter"
	"github.com/labring/sealos/controllers/user/pkg/licensegate"
	"github.com/labring/sealos/controllers/user/pkg/usercount"
	v1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	apiMeta "k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/tools/clientcmd/api"
	"k8s.io/client-go/tools/record"
	"k8s.io/client-go/util/retry"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/builder"
	ctrlcache "sigs.k8s.io/controller-runtime/pkg/cache"
	"sigs.k8s.io/controller-runtime/pkg/client"
	kubecontroller "sigs.k8s.io/controller-runtime/pkg/controller"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/handler"
	"sigs.k8s.io/controller-runtime/pkg/predicate"
)

const (
	userAnnotationCreatorKey         = userv1.UserAnnotationCreatorKey
	userAnnotationOwnerKey           = userv1.UserAnnotationOwnerKey
	userLabelOwnerKey                = userv1.UserLabelOwnerKey
	licenseLimitedCondition          = userv1.ConditionType("LicenseLimited")
	adminUserName                    = "admin"
	adminClusterRoleBindingName      = config.AdminClusterRoleBindingName
	userFinalizerName                = "sealos.io/user.finalizers"
	namespaceSyncReadyCondition      = userv1.ConditionType("NamespaceSyncReady")
	serviceAccountReadyCondition     = userv1.ConditionType("ServiceAccountSyncReady")
	kubeConfigReadyCondition         = userv1.ConditionType("KubeConfigSyncReady")
	roleSyncReadyCondition           = userv1.ConditionType("RoleSyncReady")
	roleBindingReadyCondition        = userv1.ConditionType("RoleBindingSyncReady")
	clusterRoleBindingReadyCondition = userv1.ConditionType("ClusterRoleBindingSyncReady")
)

// UserReconciler reconciles a User object
type UserReconciler struct {
	Logger      logr.Logger
	Recorder    record.EventRecorder
	cache       client.Reader
	userCounter *usercount.Counter
	config      *rest.Config
	*runtime.Scheme
	client.Client
	finalizer          *finalizer.Finalizer
	minRequeueDuration time.Duration
	nextKubeConfigSync sync.Map
	// EnableAdminClusterAdmin preserves the legacy cluster-admin binding for
	// the admin user when explicitly enabled. It is disabled by default.
	EnableAdminClusterAdmin bool
	// EnableStrictNamespacePodSecurity applies Pod Security labels to every
	// namespace whose name starts with ns-, including namespaces without a User.
	// It is enabled by default by the controller entrypoint.
	EnableStrictNamespacePodSecurity bool
}

type userReconcileState struct {
	serviceAccount          *v1.ServiceAccount
	tokenExpirationDeadline *metav1.Time
	currentSecretName       string
	kubeConfigSyncAttempted bool
	kubeConfigSynced        bool
	cleanupLegacySecrets    bool
	syncError               error
}

func (s *userReconcileState) recordSyncError(err error) {
	if s == nil || err == nil {
		return
	}
	s.syncError = errors.Join(s.syncError, err)
}

// +kubebuilder:rbac:groups=*,resources=*,verbs=*
// +kubebuilder:rbac:groups="",resources=serviceaccounts/token,verbs=create

// Reconcile is part of the main kubernetes reconciliation loop which aims to
// move the current state of the cluster closer to the desired state.
//
// For more details, check Reconcile and its Result here:
// - https://pkg.go.dev/sigs.k8s.io/controller-runtime@v0.12.2/pkg/reconcile
func (r *UserReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
	r.Logger.V(1).Info("start reconcile for users")
	user := &userv1.User{}
	if err := r.Get(ctx, req.NamespacedName, user); err != nil {
		if apierrors.IsNotFound(err) {
			r.nextKubeConfigSync.Delete(req.Name)
			if req.Name == adminUserName {
				if cleanupErr := r.cleanupDisabledAdminClusterRoleBinding(ctx); cleanupErr != nil {
					return ctrl.Result{}, cleanupErr
				}
			}
		}
		if apierrors.IsNotFound(err) && r.EnableStrictNamespacePodSecurity {
			if syncErr := r.syncOrphanNamespace(
				ctx,
				config.GetUsersNamespace(req.Name),
			); syncErr != nil {
				return ctrl.Result{}, syncErr
			}
		}
		return ctrl.Result{}, client.IgnoreNotFound(err)
	}

	if ok, err := r.finalizer.RemoveFinalizer(
		ctx,
		user,
		func(ctx context.Context, obj client.Object) error {
			ns := &v1.Namespace{}
			ns.Name = config.GetUsersNamespace(user.Name)
			_ = r.Delete(ctx, ns)
			if user.Name == adminUserName {
				return r.cleanupDisabledAdminClusterRoleBinding(ctx)
			}
			return nil
		},
	); ok {
		r.nextKubeConfigSync.Delete(user.Name)
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

type OwnerAnnotationChangedPredicate struct {
	predicate.Funcs
}

type DeletionTimestampChangedPredicate struct {
	predicate.Funcs
}

// NamespacePodSecurityPredicate reconciles ns-* namespaces when their
// Pod Security Admission labels or User ownership metadata changes.
type NamespacePodSecurityPredicate struct {
	predicate.Funcs
}

type AdminClusterRoleBindingPredicate struct {
	predicate.Funcs
}

// ignorePreStartCreatePredicate drops Create events for objects that already
// existed when this controller was configured. Existing Users re-evaluate the
// shared License and verify their children during startup. The manager starts
// each informer once; watch reconnects relist through the same informer.
//
// TODO: after upgrading controller-runtime to v0.22+, use
// event.CreateEvent.IsInInitialList and coalesce initial events for the same
// User with a bounded debounce before enqueueing one reconciliation request.
// When the minimum supported API server provides WatchList, validate its
// compatibility and fallback behavior before enabling client-go's
// KUBE_FEATURE_WatchListClient to reduce initial LIST peak memory.
type ignorePreStartCreatePredicate struct {
	predicate.Funcs
	startedAt time.Time
}

func (p ignorePreStartCreatePredicate) Create(e event.CreateEvent) bool {
	if e.Object == nil {
		return false
	}
	createdAt := e.Object.GetCreationTimestamp().Time
	if p.startedAt.IsZero() || createdAt.IsZero() {
		return true
	}
	return !createdAt.Before(p.startedAt)
}

func (AdminClusterRoleBindingPredicate) Create(e event.CreateEvent) bool {
	return e.Object.GetName() == adminClusterRoleBindingName
}

func (AdminClusterRoleBindingPredicate) Update(e event.UpdateEvent) bool {
	return e.ObjectNew.GetName() == adminClusterRoleBindingName
}

func (AdminClusterRoleBindingPredicate) Delete(e event.DeleteEvent) bool {
	return e.Object.GetName() == adminClusterRoleBindingName
}

func (AdminClusterRoleBindingPredicate) Generic(event.GenericEvent) bool {
	return false
}

func (NamespacePodSecurityPredicate) Create(e event.CreateEvent) bool {
	return isUserNamespace(e.Object.GetName())
}

func (NamespacePodSecurityPredicate) Update(e event.UpdateEvent) bool {
	if !isUserNamespace(e.ObjectNew.GetName()) {
		return false
	}
	return namespaceMetadataChanged(
		e.ObjectOld.GetAnnotations(),
		e.ObjectNew.GetAnnotations(),
		e.ObjectOld.GetLabels(),
		e.ObjectNew.GetLabels(),
	) || e.ObjectOld.GetAnnotations()[userv1.UserAnnotationCreatorKey] !=
		e.ObjectNew.GetAnnotations()[userv1.UserAnnotationCreatorKey] ||
		!reflect.DeepEqual(e.ObjectOld.GetOwnerReferences(), e.ObjectNew.GetOwnerReferences())
}

func (NamespacePodSecurityPredicate) Delete(e event.DeleteEvent) bool {
	return isUserNamespace(e.Object.GetName())
}

func (NamespacePodSecurityPredicate) Generic(event.GenericEvent) bool {
	return false
}

func podSecurityLabelsChanged(oldLabels, newLabels map[string]string) bool {
	for key := range oldLabels {
		if config.IsPodSecurityLabel(key) && oldLabels[key] != newLabels[key] {
			return true
		}
	}
	for key := range newLabels {
		if config.IsPodSecurityLabel(key) && oldLabels[key] != newLabels[key] {
			return true
		}
	}
	return false
}

func namespaceMetadataChanged(
	oldAnnotations, newAnnotations, oldLabels, newLabels map[string]string,
) bool {
	return podSecurityLabelsChanged(oldLabels, newLabels) ||
		oldAnnotations[userv1.UserAnnotationOwnerKey] != newAnnotations[userv1.UserAnnotationOwnerKey] ||
		oldLabels[userv1.UserLabelOwnerKey] != newLabels[userv1.UserLabelOwnerKey]
}

func isUserNamespace(name string) bool {
	return strings.HasPrefix(name, "ns-") && len(name) > len("ns-")
}

func (r *UserReconciler) namespaceToUserRequests(
	_ context.Context,
	obj client.Object,
) []ctrl.Request {
	if !isUserNamespace(obj.GetName()) {
		return nil
	}
	return []ctrl.Request{{NamespacedName: client.ObjectKey{
		Name: config.GetUserNameByNamespace(obj.GetName()),
	}}}
}

func metadataValueMatches(values map[string]string, key, expected string) bool {
	value, ok := values[key]
	return ok && value == expected
}

func controlledByUser(obj metav1.Object, user *userv1.User) bool {
	for _, ref := range obj.GetOwnerReferences() {
		if ref.Controller != nil && *ref.Controller &&
			ref.APIVersion == userv1.GroupVersion.String() &&
			ref.Kind == "User" && ref.Name == user.Name && ref.UID == user.UID {
			return true
		}
	}
	return false
}

func userStatusNeedsSync(user *userv1.User) bool {
	if user == nil {
		return true
	}
	if user.Status.Phase != userv1.UserActive ||
		user.Status.ObservedGeneration != user.Generation ||
		!helper.IsConditionsTrue(user.Status.Conditions) ||
		!helper.IsConditionTrue(user.Status.Conditions, userv1.Condition{
			Type:   userv1.Ready,
			Status: v1.ConditionTrue,
		}) {
		return true
	}
	if !csrExpirationStatusMatches(
		user.Spec.CSRExpirationSeconds,
		user.Status.ObservedCSRExpirationSeconds,
	) {
		return true
	}
	return user.Spec.KubeConfigRotateAt != nil &&
		(user.Status.ObservedKubeConfigRotateAt == nil ||
			!user.Spec.KubeConfigRotateAt.Equal(user.Status.ObservedKubeConfigRotateAt))
}

func csrExpirationStatusMatches(spec, observed int32) bool {
	return userv1.NormalizeCSRExpirationSeconds(spec) ==
		userv1.NormalizeCSRExpirationSeconds(observed)
}

func setObservedCSRExpirationSeconds(user *userv1.User) {
	if user == nil {
		return
	}
	user.Status.ObservedCSRExpirationSeconds = userv1.NormalizeCSRExpirationSeconds(
		user.Spec.CSRExpirationSeconds,
	)
}

func podSecurityLabelsNeedSync(
	name string,
	labels map[string]string,
	enableAdminClusterAdmin bool,
) bool {
	desired := desiredNamespaceLabels(name, cloneStringMap(labels), enableAdminClusterAdmin)
	return podSecurityLabelsChanged(labels, desired)
}

func cloneStringMap(source map[string]string) map[string]string {
	if source == nil {
		return make(map[string]string)
	}
	clone := make(map[string]string, len(source))
	maps.Copy(clone, source)
	return clone
}

func (r *UserReconciler) kubeConfigSyncDue(user *userv1.User) bool {
	if user == nil {
		return true
	}
	if value, ok := r.nextKubeConfigSync.Load(user.Name); ok {
		deadline, valid := value.(time.Time)
		return !valid || !deadline.After(time.Now())
	}
	if user.Status.KubeConfigRefreshAt == nil {
		return true
	}
	return !user.Status.KubeConfigRefreshAt.After(time.Now())
}

func namespaceMatchesUser(
	namespace metav1.Object,
	user *userv1.User,
	enableAdminClusterAdmin bool,
) bool {
	owner := user.Annotations[userv1.UserAnnotationOwnerKey]
	securityLabelsNeedSync := podSecurityLabelsNeedSync(
		namespace.GetName(),
		namespace.GetLabels(),
		enableAdminClusterAdmin,
	)
	return metadataValueMatches(
		namespace.GetAnnotations(),
		userv1.UserAnnotationCreatorKey,
		user.Name,
	) &&
		metadataValueMatches(namespace.GetAnnotations(), userv1.UserAnnotationOwnerKey, owner) &&
		metadataValueMatches(namespace.GetLabels(), userv1.UserLabelOwnerKey, owner) &&
		controlledByUser(namespace, user) &&
		!securityLabelsNeedSync
}

func roleMatchesUser(
	ctx context.Context,
	reader client.Reader,
	key client.ObjectKey,
	roleType userv1.RoleType,
	user *userv1.User,
) bool {
	role := &rbacv1.Role{}
	if err := reader.Get(ctx, key, role); err != nil {
		return false
	}
	if !metadataMatchesUserResource(role, user) {
		return false
	}
	if cachedRulesHash, ok := role.Annotations[config.RoleRulesHashAnnotation]; ok {
		return cachedRulesHash == hash.HashToString(config.GetUserRole(roleType))
	}
	return reflect.DeepEqual(role.Rules, config.GetUserRole(roleType))
}

func roleBindingMatchesUser(roleBinding *rbacv1.RoleBinding, user *userv1.User) bool {
	if !metadataMatchesUserResource(roleBinding, user) {
		return false
	}
	if cachedSpecHash, ok := roleBinding.Annotations[usercache.RoleBindingSpecHashAnnotation]; ok {
		return cachedSpecHash == usercache.RoleBindingSpecHash(
			rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "Role",
				Name:     string(userv1.OwnerRoleType),
			},
			config.GetUsersSubject(user.Name),
		)
	}
	return reflect.DeepEqual(roleBinding.Subjects, config.GetUsersSubject(user.Name)) &&
		reflect.DeepEqual(roleBinding.RoleRef, rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     string(userv1.OwnerRoleType),
		})
}

func clusterRoleBindingMatchesUser(binding *rbacv1.ClusterRoleBinding, user *userv1.User) bool {
	if !metadataMatchesUserResource(binding, user) {
		return false
	}
	if cachedSpecHash, ok := binding.Annotations[usercache.RoleBindingSpecHashAnnotation]; ok {
		return cachedSpecHash == usercache.RoleBindingSpecHash(
			rbacv1.RoleRef{
				APIGroup: rbacv1.GroupName,
				Kind:     "ClusterRole",
				Name:     "cluster-admin",
			},
			config.GetUsersSubject(user.Name),
		)
	}
	return reflect.DeepEqual(binding.Subjects, config.GetUsersSubject(user.Name)) &&
		reflect.DeepEqual(binding.RoleRef, rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "ClusterRole",
			Name:     "cluster-admin",
		})
}

func metadataMatchesUserResource(metadata metav1.Object, user *userv1.User) bool {
	owner := user.Annotations[userv1.UserAnnotationOwnerKey]
	return metadataValueMatches(
		metadata.GetAnnotations(),
		userv1.UserAnnotationCreatorKey,
		user.Name,
	) &&
		metadataValueMatches(metadata.GetAnnotations(), userv1.UserAnnotationOwnerKey, owner) &&
		controlledByUser(metadata, user)
}

func (r *UserReconciler) syncOrphanNamespace(ctx context.Context, namespaceName string) error {
	if !r.EnableStrictNamespacePodSecurity || !isUserNamespace(namespaceName) {
		return nil
	}
	return retry.RetryOnConflict(retry.DefaultRetry, func() error {
		ns := &v1.Namespace{}
		if err := r.Get(ctx, client.ObjectKey{Name: namespaceName}, ns); err != nil {
			if apierrors.IsNotFound(err) {
				return nil
			}
			return err
		}
		if _, err := controllerutil.CreateOrUpdate(ctx, r.Client, ns, func() error {
			if ns.Labels == nil {
				ns.Labels = make(map[string]string)
			}
			ns.Labels = config.SetPodSecurity(ns.Labels)
			return nil
		}); err != nil {
			return fmt.Errorf(
				"unable to apply Pod Security labels to orphan namespace %s: %w",
				namespaceName,
				err,
			)
		}
		return nil
	})
}

func (r *UserReconciler) cleanupDisabledAdminClusterRoleBinding(ctx context.Context) error {
	if r.EnableAdminClusterAdmin {
		return nil
	}
	binding := &rbacv1.ClusterRoleBinding{}
	binding.Name = adminClusterRoleBindingName
	if err := r.Delete(ctx, binding); err != nil && !apierrors.IsNotFound(err) {
		return fmt.Errorf("unable to remove disabled admin cluster role binding: %w", err)
	}
	return nil
}

func (r *UserReconciler) adminClusterRoleBindingToUserRequests(
	_ context.Context,
	obj client.Object,
) []ctrl.Request {
	if obj.GetName() != adminClusterRoleBindingName {
		return nil
	}
	return []ctrl.Request{{NamespacedName: client.ObjectKey{Name: adminUserName}}}
}

func desiredNamespaceLabels(
	name string,
	labels map[string]string,
	enableAdminClusterAdmin bool,
) map[string]string {
	if name == config.GetUsersNamespace(adminUserName) && enableAdminClusterAdmin {
		for key := range labels {
			if config.IsPodSecurityLabel(key) {
				delete(labels, key)
			}
		}
		return labels
	}
	return config.SetPodSecurity(labels)
}

type adminPrivilegeMigration struct {
	client                  client.Client
	reader                  client.Reader
	reconciler              *UserReconciler
	enableAdminClusterAdmin bool
}

func (c *adminPrivilegeMigration) Start(ctx context.Context) error {
	if !c.enableAdminClusterAdmin {
		binding := &rbacv1.ClusterRoleBinding{}
		binding.Name = adminClusterRoleBindingName
		if err := c.client.Delete(ctx, binding); err != nil && !apierrors.IsNotFound(err) {
			return fmt.Errorf("remove disabled admin cluster role binding: %w", err)
		}
	}
	if c.reconciler == nil {
		return nil
	}
	admin := &userv1.User{}
	if c.reader == nil {
		return errors.New("admin user privilege migration reader is nil")
	}
	if err := c.reader.Get(ctx, client.ObjectKey{Name: adminUserName}, admin); err != nil {
		if apierrors.IsNotFound(err) || apiMeta.IsNoMatchError(err) {
			return nil
		}
		return fmt.Errorf("get admin user for privilege migration: %w", err)
	}
	state := &userReconcileState{}
	c.reconciler.syncNamespace(ctx, admin, state)
	c.reconciler.syncClusterRoleBinding(ctx, admin, state)
	if state.syncError != nil {
		return fmt.Errorf("sync admin privileges: %w", state.syncError)
	}
	return nil
}

func (c *adminPrivilegeMigration) NeedLeaderElection() bool {
	return true
}

func (OwnerAnnotationChangedPredicate) Update(e event.UpdateEvent) bool {
	return e.ObjectOld.GetAnnotations()[userAnnotationOwnerKey] !=
		e.ObjectNew.GetAnnotations()[userAnnotationOwnerKey]
}

func (DeletionTimestampChangedPredicate) Update(e event.UpdateEvent) bool {
	return !reflect.DeepEqual(
		e.ObjectOld.GetDeletionTimestamp(),
		e.ObjectNew.GetDeletionTimestamp(),
	)
}

// SetupWithManager sets up the controller with the Manager.
// The deprecated max-requeue-duration and restart-predicate-time arguments are
// retained for compatibility and ignored.
func (r *UserReconciler) SetupWithManager(mgr ctrl.Manager, opts ratelimiter.RateLimiterOptions,
	minRequeueDuration, _, _ time.Duration,
	userCounter *usercount.Counter,
) error {
	controllerStartedAt := time.Now()
	const controllerName = "user_controller"
	if r.Client == nil {
		r.Client = mgr.GetClient()
	}
	r.Logger = ctrl.Log.WithName(controllerName)
	if r.Recorder == nil {
		r.Recorder = mgr.GetEventRecorderFor(controllerName)
	}
	if r.finalizer == nil {
		r.finalizer = finalizer.NewFinalizer(r.Client, userFinalizerName).
			WithReader(mgr.GetAPIReader())
	}
	r.Scheme = mgr.GetScheme()
	r.cache = mgr.GetCache()
	r.userCounter = userCounter
	r.config = mgr.GetConfig()
	r.Logger.V(1).Info("init reconcile controller user")
	r.minRequeueDuration = minRequeueDuration

	if err := mgr.Add(&adminPrivilegeMigration{
		client:                  r.Client,
		reader:                  mgr.GetAPIReader(),
		reconciler:              r,
		enableAdminClusterAdmin: r.EnableAdminClusterAdmin,
	}); err != nil {
		return fmt.Errorf("add admin privilege migration: %w", err)
	}

	secretMetadata := &metav1.PartialObjectMetadata{}
	secretMetadata.SetGroupVersionKind(v1.SchemeGroupVersion.WithKind("Secret"))
	if err := mgr.GetFieldIndexer().IndexField(
		context.Background(),
		secretMetadata,
		v1.ServiceAccountNameKey,
		func(rawObj client.Object) []string {
			var annotations map[string]string
			switch secret := rawObj.(type) {
			case *v1.Secret:
				annotations = secret.Annotations
			case *metav1.PartialObjectMetadata:
				annotations = secret.Annotations
			}
			if annotations == nil {
				return nil
			}
			value := annotations[v1.ServiceAccountNameKey]
			if value == "" {
				return nil
			}
			return []string{value}
		},
	); err != nil {
		return err
	}
	if err := registerStartupCacheInformers(mgr.GetCache()); err != nil {
		return err
	}

	ownerEventHandler := handler.EnqueueRequestForOwner(
		r.Scheme,
		r.RESTMapper(),
		&userv1.User{},
		handler.OnlyControllerOwner(),
	)
	ignorePreStartCreate := ignorePreStartCreatePredicate{startedAt: controllerStartedAt}
	// Preserve the name derived from For(&userv1.User{}) for metrics and queue identity.
	return ctrl.NewControllerManagedBy(mgr).
		Named("user").
		Watches(
			&userv1.User{},
			userEventHandler{},
			builder.WithPredicates(predicate.Or(
				predicate.GenerationChangedPredicate{},
				OwnerAnnotationChangedPredicate{},
				DeletionTimestampChangedPredicate{},
			)),
		).
		WatchesMetadata(
			&v1.Namespace{},
			handler.EnqueueRequestsFromMapFunc(r.namespaceToUserRequests),
			builder.WithPredicates(NamespacePodSecurityPredicate{}),
		).
		Watches(
			&rbacv1.ClusterRoleBinding{},
			handler.EnqueueRequestsFromMapFunc(r.adminClusterRoleBindingToUserRequests),
			builder.WithPredicates(AdminClusterRoleBindingPredicate{}),
		).
		Watches(
			&licensev1.License{},
			handler.EnqueueRequestsFromMapFunc(r.licenseToUserRequests),
			builder.OnlyMetadata,
			builder.WithPredicates(ignorePreStartCreate),
		).
		Watches(
			&rbacv1.Role{},
			ownerEventHandler,
			builder.WithPredicates(ignorePreStartCreate),
		).
		Watches(
			&rbacv1.RoleBinding{},
			ownerEventHandler,
			builder.WithPredicates(ignorePreStartCreate),
		).
		Watches(
			&v1.ServiceAccount{},
			ownerEventHandler,
			builder.WithPredicates(ignorePreStartCreate),
		).
		WatchesMetadata(
			&v1.Secret{},
			ownerEventHandler,
			builder.WithPredicates(ignorePreStartCreate),
		).
		WithOptions(kubecontroller.Options{
			MaxConcurrentReconciles: ratelimiter.GetConcurrent(opts),
			RateLimiter:             ratelimiter.GetRateLimiter(opts),
		}).
		Complete(r)
}

func registerStartupCacheInformers(informers ctrlcache.Informers) error {
	if informers == nil {
		return errors.New("user controller cache is nil")
	}
	namespaceMetadata := &metav1.PartialObjectMetadata{}
	namespaceMetadata.SetGroupVersionKind(v1.SchemeGroupVersion.WithKind("Namespace"))
	secretMetadata := &metav1.PartialObjectMetadata{}
	secretMetadata.SetGroupVersionKind(v1.SchemeGroupVersion.WithKind("Secret"))
	objects := []client.Object{
		namespaceMetadata,
		&v1.ServiceAccount{},
		secretMetadata,
		&rbacv1.Role{},
		&rbacv1.RoleBinding{},
		&rbacv1.ClusterRoleBinding{},
	}
	for _, object := range objects {
		if _, err := informers.GetInformer(context.Background(), object); err != nil {
			return fmt.Errorf("register startup cache informer for %T: %w", object, err)
		}
	}
	return nil
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
	if userStatusNeedsSync(user) {
		r.initStatus(ctx, user, state)
	}
	r.syncNamespaceIfNeeded(ctx, user, state)
	r.syncServiceAccountIfNeeded(ctx, user, state)
	r.syncKubeConfigIfNeeded(ctx, user, state)
	r.syncRolesIfNeeded(ctx, user, state)
	r.syncRoleBindingIfNeeded(ctx, user, state)
	r.syncClusterRoleBindingIfNeeded(ctx, user, state)
	r.syncFinalStatus(ctx, user, state)
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
	statusChanged := !reflect.DeepEqual(user.Status, *originalStatus)
	if statusChanged && state.kubeConfigSynced {
		// Normalize the observed duration only when this reconcile successfully
		// refreshed kubeconfig and is about to persist its status.
		setObservedCSRExpirationSeconds(user)
	}
	if !statusChanged {
		requeueAfter := nextKubeConfigRequeueDuration(user, state)
		if syncErr := r.finishKubeConfigSync(user, state); syncErr != nil {
			return ctrl.Result{}, syncErr
		}
		if state.syncError != nil {
			return ctrl.Result{}, state.syncError
		}
		return ctrl.Result{RequeueAfter: requeueAfter}, nil
	}
	if err = r.updateStatus(ctx, user, originalStatus); err != nil {
		if state.kubeConfigSyncAttempted {
			// The generated kubeconfig is not durable until the status patch succeeds.
			r.nextKubeConfigSync.Store(user.Name, time.Now())
		}
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
	requeueAfter := nextKubeConfigRequeueDuration(user, state)
	if syncErr := r.finishKubeConfigSync(user, state); syncErr != nil {
		return ctrl.Result{}, syncErr
	}
	if state.syncError != nil {
		return ctrl.Result{}, state.syncError
	}
	return ctrl.Result{RequeueAfter: requeueAfter}, nil
}

func (r *UserReconciler) finishKubeConfigSync(
	user *userv1.User,
	state *userReconcileState,
) error {
	if state == nil || user == nil {
		return nil
	}
	if !state.kubeConfigSyncAttempted {
		return nil
	}
	if !state.kubeConfigSynced {
		// Keep the in-memory deadline due so the next workqueue retry does not
		// get hidden by a future persisted refresh time.
		r.nextKubeConfigSync.Store(user.Name, time.Now())
		return state.syncError
	}
	if user.Status.KubeConfigRefreshAt == nil || user.Status.KubeConfigRefreshAt.IsZero() {
		// A successful refresh always persists this field. Clearing the entry
		// keeps a malformed in-memory state from suppressing a retry.
		r.nextKubeConfigSync.Delete(user.Name)
		return nil
	}
	// The workqueue requeue interval is for ordinary drift checks. Kubeconfig
	// refreshes must follow the persisted token deadline instead.
	r.nextKubeConfigSync.Store(user.Name, user.Status.KubeConfigRefreshAt.Time)
	return nil
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

func (r *UserReconciler) markConditionReadyIfNeeded(
	user *userv1.User,
	conditionType userv1.ConditionType,
) {
	for i := range user.Status.Conditions {
		if user.Status.Conditions[i].Type != conditionType ||
			user.Status.Conditions[i].Status == v1.ConditionTrue {
			continue
		}
		r.saveCondition(user, &userv1.Condition{
			Type:               conditionType,
			Status:             v1.ConditionTrue,
			Reason:             string(userv1.Ready),
			Message:            "cached resource matches desired state",
			LastTransitionTime: metav1.Now(),
			LastHeartbeatTime:  metav1.Now(),
		})
		return
	}
}

func (r *UserReconciler) syncNamespaceIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	if r.cache != nil {
		namespace := &metav1.PartialObjectMetadata{}
		namespace.SetGroupVersionKind(v1.SchemeGroupVersion.WithKind("Namespace"))
		if err := r.cache.Get(
			ctx,
			client.ObjectKey{Name: config.GetUsersNamespace(user.Name)},
			namespace,
		); err == nil &&
			namespaceMatchesUser(namespace, user, r.EnableAdminClusterAdmin) {
			r.markConditionReadyIfNeeded(user, namespaceSyncReadyCondition)
			return
		}
	}
	r.syncNamespace(ctx, user, state)
}

func (r *UserReconciler) syncServiceAccountIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	if r.cache != nil {
		serviceAccount := &v1.ServiceAccount{}
		if err := r.cache.Get(ctx, client.ObjectKey{
			Name: user.Name, Namespace: config.GetUserSystemNamespace(),
		}, serviceAccount); err == nil && metadataMatchesUserResource(serviceAccount, user) {
			state.serviceAccount = serviceAccount
			r.markConditionReadyIfNeeded(user, serviceAccountReadyCondition)
			return
		}
	}
	r.syncServiceAccount(ctx, user, state)
}

func (r *UserReconciler) syncKubeConfigIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	if r.cache != nil && !kubeConfigSyncFailed(user) &&
		!r.kubeConfigSyncDue(user) &&
		csrExpirationStatusMatches(
			user.Spec.CSRExpirationSeconds,
			user.Status.ObservedCSRExpirationSeconds,
		) &&
		user.Status.KubeConfigRefreshAt != nil &&
		!userKubeConfigNeedsRotation(user) && r.boundTokenSecretMatches(ctx, user, state) {
		r.markConditionReadyIfNeeded(user, kubeConfigReadyCondition)
		return
	}
	state.kubeConfigSyncAttempted = true
	r.syncKubeConfig(ctx, user, state)
}

func (r *UserReconciler) boundTokenSecretMatches(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) bool {
	if state == nil || state.serviceAccount == nil || len(state.serviceAccount.Secrets) == 0 ||
		state.serviceAccount.Secrets[0].Name == "" {
		return false
	}
	secret := &metav1.PartialObjectMetadata{}
	secret.SetGroupVersionKind(v1.SchemeGroupVersion.WithKind("Secret"))
	if err := r.cache.Get(ctx, client.ObjectKey{
		Name: state.serviceAccount.Secrets[0].Name, Namespace: config.GetUserSystemNamespace(),
	}, secret); err != nil {
		return false
	}
	if secret.Annotations[v1.ServiceAccountNameKey] != user.Name ||
		!controlledByUser(secret, user) {
		return false
	}
	if user.Status.ObservedKubeConfigSecretUID == "" {
		// Legacy Users without an observed UID can keep using the current Secret.
		// Persist the UID only after a successful kubeconfig refresh.
		return true
	}
	return string(secret.UID) == user.Status.ObservedKubeConfigSecretUID
}

func (r *UserReconciler) syncRolesIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	roleCondition := &userv1.Condition{
		Type:               roleSyncReadyCondition,
		Status:             v1.ConditionTrue,
		LastTransitionTime: metav1.Now(),
		LastHeartbeatTime:  metav1.Now(),
		Reason:             string(userv1.Ready),
		Message:            "sync namespace role successfully",
	}
	previousCondition := helper.GetCondition(user.Status.Conditions, roleCondition).DeepCopy()
	defer func() {
		if helper.DiffCondition(previousCondition, roleCondition) {
			r.saveCondition(user, roleCondition.DeepCopy())
		}
	}()
	for _, roleType := range []userv1.RoleType{
		userv1.OwnerRoleType,
		userv1.ManagerRoleType,
		userv1.DeveloperRoleType,
	} {
		healthy := false
		if r.cache != nil {
			healthy = roleMatchesUser(ctx, r.cache, client.ObjectKey{
				Name: string(roleType), Namespace: config.GetUsersNamespace(user.Name),
			}, roleType, user)
		}
		if healthy {
			continue
		}
		r.createRole(ctx, roleCondition, user, state, roleType)
	}
}

func (r *UserReconciler) syncRoleBindingIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	if r.cache != nil {
		roleBinding := &rbacv1.RoleBinding{}
		if err := r.cache.Get(ctx, client.ObjectKey{
			Name: user.Name, Namespace: config.GetUsersNamespace(user.Name),
		}, roleBinding); err == nil && roleBindingMatchesUser(roleBinding, user) {
			r.markConditionReadyIfNeeded(user, roleBindingReadyCondition)
			return
		}
	}
	r.syncRoleBinding(ctx, user, state)
}

func (r *UserReconciler) syncClusterRoleBindingIfNeeded(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
) {
	if user.Name != adminUserName {
		return
	}
	if r.cache != nil {
		binding := &rbacv1.ClusterRoleBinding{}
		err := r.cache.Get(ctx, client.ObjectKey{Name: adminClusterRoleBindingName}, binding)
		healthy := (!r.EnableAdminClusterAdmin && apierrors.IsNotFound(err)) ||
			(r.EnableAdminClusterAdmin && err == nil && clusterRoleBindingMatchesUser(binding, user))
		if healthy {
			r.markConditionReadyIfNeeded(user, clusterRoleBindingReadyCondition)
			return
		}
	}
	r.syncClusterRoleBinding(ctx, user, state)
}

func (r *UserReconciler) syncNamespace(
	ctx context.Context,
	user *userv1.User,
	state *userReconcileState,
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
			ns.Labels = desiredNamespaceLabels(ns.Name, ns.Labels, r.EnableAdminClusterAdmin)
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
		state.recordSyncError(err)
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

func (r *UserReconciler) createRole(
	ctx context.Context,
	condition *userv1.Condition,
	user *userv1.User,
	state *userReconcileState,
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
		state.recordSyncError(err)
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
	state *userReconcileState,
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
		state.recordSyncError(err)
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
	state *userReconcileState,
) {
	if user.Name != adminUserName {
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
	if !r.EnableAdminClusterAdmin {
		clusterRoleBinding := &rbacv1.ClusterRoleBinding{}
		clusterRoleBinding.Name = adminClusterRoleBindingName
		if err := r.Delete(ctx, clusterRoleBinding); err != nil && !apierrors.IsNotFound(err) {
			err = fmt.Errorf("unable to remove disabled admin cluster role binding: %w", err)
			state.recordSyncError(err)
			helper.SetConditionError(rbCondition, "SyncUserError", err)
			r.Recorder.Eventf(
				user,
				v1.EventTypeWarning,
				"syncUserClusterRoleBinding",
				"Remove User admin cluster role binding %s is error: %v",
				user.Name,
				err,
			)
			return
		}
		rbCondition.Message = "admin cluster role binding disabled"
		return
	}
	if err := retry.RetryOnConflict(retry.DefaultRetry, func() error {
		var change controllerutil.OperationResult
		var err error
		clusterRoleBinding := &rbacv1.ClusterRoleBinding{}
		clusterRoleBinding.Name = adminClusterRoleBindingName
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
		state.recordSyncError(err)
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
	userCondition := &userv1.Condition{
		Type:               kubeConfigReadyCondition,
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
		saErr := errors.New("serviceAccount not found")
		state.recordSyncError(saErr)
		helper.SetConditionError(
			userCondition,
			"SyncUserError",
			saErr,
		)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Sync User namespace  kubeconfig %s is error: %v",
			user.Name,
			saErr,
		)
		return
	}
	// Keep an owned copy because kubeconfig generation may update metadata on it.
	sa = sa.DeepCopy()
	if r.shouldRotateKubeConfig(user) {
		if err := r.deleteBoundTokenSecret(ctx, user); err != nil {
			state.recordSyncError(err)
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
		state.recordSyncError(err)
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
		configErr := errors.New("api.config is nil")
		state.recordSyncError(configErr)
		helper.SetConditionError(
			userCondition,
			"SyncKubeConfigError",
			configErr,
		)
		r.Recorder.Eventf(
			user,
			v1.EventTypeWarning,
			"syncKubeConfig",
			"Sync KubeConfig apply %s is error: %v",
			user.Name,
			configErr,
		)
		return
	}
	kubeData, err := clientcmd.Write(*apiConfig)
	if err != nil {
		state.recordSyncError(err)
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
	keepSecretName := ""
	if len(sa.Secrets) > 0 {
		keepSecretName = sa.Secrets[0].Name
	}
	secretUID := ""
	if keepSecretName != "" {
		boundSecret := &v1.Secret{}
		if err := r.Get(ctx, client.ObjectKey{
			Name: keepSecretName, Namespace: config.GetUserSystemNamespace(),
		}, boundSecret); err != nil {
			state.recordSyncError(err)
			helper.SetConditionError(userCondition, "SyncKubeConfigError", err)
			r.Recorder.Eventf(
				user,
				v1.EventTypeWarning,
				"syncKubeConfig",
				"Get bound token secret %s is error: %v",
				user.Name,
				err,
			)
			return
		}
		secretUID = string(boundSecret.UID)
	}
	state.tokenExpirationDeadline = &tokenExpiresAt
	refreshAt := metav1.NewTime(time.Now().Add(time.Until(tokenExpiresAt.Time) * 8 / 10))
	user.Status.KubeConfigRefreshAt = &refreshAt
	user.Status.ObservedKubeConfigSecretUID = secretUID
	if r.shouldRotateKubeConfig(user) {
		user.Status.ObservedKubeConfigRotateAt = user.Spec.KubeConfigRotateAt
	}
	user.Status.KubeConfig = string(kubeData)
	userCondition.Message = "renew sync kube config successfully hash " + hash.HashToString(
		user.Status.KubeConfig,
	)
	state.currentSecretName = keepSecretName
	state.kubeConfigSynced = true
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
		csrExpirationStatusMatches(
			user.Spec.CSRExpirationSeconds,
			user.Status.ObservedCSRExpirationSeconds,
		) {
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
	return userKubeConfigNeedsRotation(user)
}

func userKubeConfigNeedsRotation(user *userv1.User) bool {
	if user == nil {
		return false
	}
	if user.Spec.KubeConfigRotateAt == nil {
		return false
	}
	if user.Status.ObservedKubeConfigRotateAt == nil {
		return true
	}
	return !user.Spec.KubeConfigRotateAt.Equal(user.Status.ObservedKubeConfigRotateAt)
}

func kubeConfigSyncFailed(user *userv1.User) bool {
	if user == nil {
		return false
	}
	for _, condition := range user.Status.Conditions {
		if condition.Type == kubeConfigReadyCondition {
			return condition.Status == v1.ConditionFalse
		}
	}
	return false
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
	if user == nil || user.Status.ObservedGeneration != 0 {
		return false
	}
	for _, condition := range user.Status.Conditions {
		if condition.Type != licenseLimitedCondition {
			return false
		}
	}
	return true
}

func nextKubeConfigRequeueDuration(
	user *userv1.User,
	state *userReconcileState,
) time.Duration {
	if state != nil && state.tokenExpirationDeadline != nil &&
		!state.tokenExpirationDeadline.IsZero() {
		refreshDuration := time.Until(state.tokenExpirationDeadline.Time) * 8 / 10
		if refreshDuration <= 0 {
			return time.Second
		}
		return refreshDuration
	}
	if user == nil || user.Status.KubeConfigRefreshAt == nil ||
		user.Status.KubeConfigRefreshAt.IsZero() {
		return 0
	}
	refreshDuration := time.Until(user.Status.KubeConfigRefreshAt.Time)
	if refreshDuration <= 0 {
		return time.Second
	}
	return refreshDuration
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
