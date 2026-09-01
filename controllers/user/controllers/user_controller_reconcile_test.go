// Copyright 2026 labring.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package controllers

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	usercache "github.com/labring/sealos/controllers/user/controllers/cache"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func reconcileTestScheme(t *testing.T) *runtime.Scheme {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add RBAC scheme: %v", err)
	}
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	return scheme
}

func reconcileTestUser(name string) *userv1.User {
	return &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name: name,
			UID:  types.UID("uid-" + name),
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey: "owner",
			},
		},
	}
}

func reconcileTestOwnerReference(user *userv1.User) metav1.OwnerReference {
	controller := true
	return metav1.OwnerReference{
		APIVersion: userv1.GroupVersion.String(),
		Kind:       "User",
		Name:       user.Name,
		UID:        user.UID,
		Controller: &controller,
	}
}

func reconcileTestRole(user *userv1.User, roleType userv1.RoleType) *rbacv1.Role {
	return &rbacv1.Role{
		ObjectMeta: metav1.ObjectMeta{
			Name:      string(roleType),
			Namespace: config.GetUsersNamespace(user.Name),
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: user.Name,
				userv1.UserAnnotationOwnerKey:   "owner",
			},
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
		Rules: config.GetUserRole(roleType),
	}
}

func TestRoleBindingMatchesUserUsesProjectedSpecHash(t *testing.T) {
	user := reconcileTestUser("alice")
	binding := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      user.Name,
			Namespace: config.GetUsersNamespace(user.Name),
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: user.Name,
				userv1.UserAnnotationOwnerKey:   "owner",
			},
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
	}
	binding.Annotations[usercache.RoleBindingSpecHashAnnotation] = usercache.RoleBindingSpecHash(
		rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     string(userv1.OwnerRoleType),
		},
		config.GetUsersSubject(user.Name),
	)
	if !roleBindingMatchesUser(binding, user) {
		t.Fatal("projected role binding hash was not accepted")
	}
	binding.Annotations[usercache.RoleBindingSpecHashAnnotation] = "drifted"
	if roleBindingMatchesUser(binding, user) {
		t.Fatal("drifted projected role binding hash was accepted")
	}
}

func TestResourceSyncIfNeededRepairsMissingResources(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		userName  string
		adminRole bool
		objects   func(*userv1.User) []client.Object
		sync      func(context.Context, *UserReconciler, *userv1.User, *userReconcileState)
		verify    func(*testing.T, client.Client, *userv1.User)
	}{
		{
			name:     "namespace",
			userName: "alice",
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncNamespaceIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				ns := &corev1.Namespace{}
				if err := cli.Get(
					context.Background(),
					client.ObjectKey{Name: config.GetUsersNamespace(user.Name)},
					ns,
				); err != nil {
					t.Fatalf("get repaired namespace: %v", err)
				}
				if !namespaceMatchesUser(ns, user, false) {
					t.Fatal("repaired namespace does not match user")
				}
			},
		},
		{
			name:     "service account",
			userName: "alice",
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncServiceAccountIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				sa := &corev1.ServiceAccount{}
				if err := cli.Get(context.Background(), client.ObjectKey{
					Name: user.Name, Namespace: config.GetUserSystemNamespace(),
				}, sa); err != nil {
					t.Fatalf("get repaired service account: %v", err)
				}
				if !metadataMatchesUserResource(sa, user) {
					t.Fatal("repaired service account does not match user")
				}
			},
		},
		{
			name:     "missing developer role",
			userName: "alice",
			objects: func(user *userv1.User) []client.Object {
				return []client.Object{
					reconcileTestRole(user, userv1.OwnerRoleType),
					reconcileTestRole(user, userv1.ManagerRoleType),
				}
			},
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncRolesIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				role := &rbacv1.Role{}
				if err := cli.Get(context.Background(), client.ObjectKey{
					Name:      string(userv1.DeveloperRoleType),
					Namespace: config.GetUsersNamespace(user.Name),
				}, role); err != nil {
					t.Fatalf("get repaired developer role: %v", err)
				}
				if !roleMatchesUser(
					context.Background(),
					cli,
					client.ObjectKeyFromObject(role),
					userv1.DeveloperRoleType,
					user,
				) {
					t.Fatal("repaired developer role does not match user")
				}
			},
		},
		{
			name:     "drifted developer role",
			userName: "alice",
			objects: func(user *userv1.User) []client.Object {
				role := reconcileTestRole(user, userv1.DeveloperRoleType)
				role.Rules = []rbacv1.PolicyRule{{
					Resources: []string{"pods"},
					Verbs:     []string{"get"},
				}}
				return []client.Object{
					reconcileTestRole(user, userv1.OwnerRoleType),
					reconcileTestRole(user, userv1.ManagerRoleType),
					role,
				}
			},
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncRolesIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				role := &rbacv1.Role{}
				if err := cli.Get(context.Background(), client.ObjectKey{
					Name:      string(userv1.DeveloperRoleType),
					Namespace: config.GetUsersNamespace(user.Name),
				}, role); err != nil {
					t.Fatalf("get repaired developer role: %v", err)
				}
				if !roleMatchesUser(
					context.Background(),
					cli,
					client.ObjectKeyFromObject(role),
					userv1.DeveloperRoleType,
					user,
				) {
					t.Fatal("drifted developer role was not repaired")
				}
			},
		},
		{
			name:     "role binding",
			userName: "alice",
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncRoleBindingIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				binding := &rbacv1.RoleBinding{}
				if err := cli.Get(context.Background(), client.ObjectKey{
					Name: user.Name, Namespace: config.GetUsersNamespace(user.Name),
				}, binding); err != nil {
					t.Fatalf("get repaired role binding: %v", err)
				}
				if !roleBindingMatchesUser(binding, user) {
					t.Fatal("repaired role binding does not match user")
				}
			},
		},
		{
			name:      "admin cluster role binding",
			userName:  adminUserName,
			adminRole: true,
			sync: func(ctx context.Context, r *UserReconciler, user *userv1.User, state *userReconcileState) {
				r.syncClusterRoleBindingIfNeeded(ctx, user, state)
			},
			verify: func(t *testing.T, cli client.Client, user *userv1.User) {
				t.Helper()
				binding := &rbacv1.ClusterRoleBinding{}
				if err := cli.Get(
					context.Background(),
					client.ObjectKey{Name: adminClusterRoleBindingName},
					binding,
				); err != nil {
					t.Fatalf("get repaired admin cluster role binding: %v", err)
				}
				if !clusterRoleBindingMatchesUser(binding, user) {
					t.Fatal("repaired admin cluster role binding does not match user")
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			scheme := reconcileTestScheme(t)
			user := reconcileTestUser(tt.userName)
			var objects []client.Object
			if tt.objects != nil {
				objects = tt.objects(user)
			}
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
			r := &UserReconciler{
				Client:                  cli,
				Scheme:                  scheme,
				Recorder:                record.NewFakeRecorder(32),
				EnableAdminClusterAdmin: tt.adminRole,
				cache:                   cli,
			}

			tt.sync(context.Background(), r, user, &userReconcileState{})
			tt.verify(t, cli, user)
		})
	}
}

func benchmarkProcessedUser(name string, refreshAt time.Time) *userv1.User {
	return &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name:       name,
			UID:        types.UID("uid-" + name),
			Generation: 1,
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey: "owner",
			},
		},
		Spec: userv1.UserSpec{
			CSRExpirationSeconds: userv1.DefaultCSRExpirationSeconds,
		},
		Status: userv1.UserStatus{
			Phase:                        userv1.UserActive,
			ObservedGeneration:           1,
			ObservedCSRExpirationSeconds: userv1.DefaultCSRExpirationSeconds,
			KubeConfigRefreshAt:          &metav1.Time{Time: refreshAt},
			ObservedKubeConfigSecretUID:  "secret-" + name,
			Conditions: []userv1.Condition{
				{Type: userv1.Initialized, Status: corev1.ConditionTrue},
				{
					Type:    namespaceSyncReadyCondition,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "sync namespace successfully",
				},
				{
					Type:    serviceAccountReadyCondition,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "sync namespace sa successfully",
				},
				{
					Type:    kubeConfigReadyCondition,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "sync kube config successfully",
				},
				{
					Type:    roleSyncReadyCondition,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "sync namespace role successfully",
				},
				{
					Type:    roleBindingReadyCondition,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "sync namespace role binding successfully",
				},
				{
					Type:    userv1.Ready,
					Status:  corev1.ConditionTrue,
					Reason:  string(userv1.Ready),
					Message: "User is available now",
				},
			},
		},
	}
}

// healthyStartupCache returns only the fields used by the fast-path checks,
// matching the projected objects held by the production cache.
type healthyStartupCache struct{}

func (healthyStartupCache) Get(
	_ context.Context,
	key client.ObjectKey,
	obj client.Object,
	_ ...client.GetOption,
) error {
	owner := "owner"
	var userName string
	switch typed := obj.(type) {
	case *metav1.PartialObjectMetadata:
		if typed.GroupVersionKind().Kind == "Secret" {
			userName = strings.TrimPrefix(key.Name, "token-")
			typed.Name = key.Name
			typed.Namespace = key.Namespace
			typed.UID = types.UID("secret-" + userName)
			typed.Annotations = map[string]string{corev1.ServiceAccountNameKey: userName}
			typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
			return nil
		}
		userName = config.GetUserNameByNamespace(key.Name)
		typed.Name = key.Name
		typed.Annotations = map[string]string{
			userv1.UserAnnotationCreatorKey: userName,
			userv1.UserAnnotationOwnerKey:   owner,
		}
		typed.Labels = config.SetPodSecurity(map[string]string{
			userv1.UserLabelOwnerKey: owner,
		})
		typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
		return nil
	case *corev1.ServiceAccount:
		userName = key.Name
		typed.Name = key.Name
		typed.Namespace = key.Namespace
		typed.Annotations = benchmarkAnnotations(userName, owner)
		typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
		typed.Secrets = []corev1.ObjectReference{{Name: "token-" + userName}}
		return nil
	case *corev1.Secret:
		userName = strings.TrimPrefix(key.Name, "token-")
		typed.Name = key.Name
		typed.Namespace = key.Namespace
		typed.UID = types.UID("secret-" + userName)
		typed.Annotations = map[string]string{corev1.ServiceAccountNameKey: userName}
		typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
		return nil
	case *rbacv1.Role:
		userName = config.GetUserNameByNamespace(key.Namespace)
		typed.Name = key.Name
		typed.Namespace = key.Namespace
		typed.Annotations = benchmarkAnnotations(userName, owner)
		typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
		typed.Rules = config.GetUserRole(userv1.RoleType(key.Name))
		return nil
	case *rbacv1.RoleBinding:
		userName = config.GetUserNameByNamespace(key.Namespace)
		typed.Name = key.Name
		typed.Namespace = key.Namespace
		typed.Annotations = benchmarkAnnotations(userName, owner)
		typed.OwnerReferences = []metav1.OwnerReference{benchmarkOwnerReference(userName)}
		typed.RoleRef = rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     string(userv1.OwnerRoleType),
		}
		typed.Subjects = config.GetUsersSubject(userName)
		return nil
	default:
		return fmt.Errorf("unexpected cache object type %T", obj)
	}
}

func (healthyStartupCache) List(context.Context, client.ObjectList, ...client.ListOption) error {
	return errors.New("unexpected cache list call")
}

func benchmarkOwnerReference(userName string) metav1.OwnerReference {
	controller := true
	return metav1.OwnerReference{
		APIVersion: userv1.GroupVersion.String(),
		Kind:       "User",
		Name:       userName,
		UID:        types.UID("uid-" + userName),
		Controller: &controller,
	}
}

func benchmarkAnnotations(userName, owner string) map[string]string {
	return map[string]string{
		userv1.UserAnnotationCreatorKey: userName,
		userv1.UserAnnotationOwnerKey:   owner,
	}
}

func TestReconcileSkipsHealthyCachedUserResources(t *testing.T) {
	t.Parallel()
	user := benchmarkProcessedUser("alice", time.Now().Add(time.Hour))
	originalStatus := user.Status.DeepCopy()
	r := &UserReconciler{
		cache:              healthyStartupCache{},
		minRequeueDuration: time.Minute,
	}

	if _, err := r.reconcile(context.Background(), user); err != nil {
		t.Fatalf("reconcile healthy cached user: %v", err)
	}
	if !reflect.DeepEqual(user.Status, *originalStatus) {
		t.Fatalf(
			"healthy cached user status changed: before=%#v after=%#v",
			originalStatus,
			user.Status,
		)
	}
}

func TestReconcileSkipsHealthyStatusWithoutLegacyConditions(t *testing.T) {
	t.Parallel()
	user := benchmarkProcessedUser("legacy-user", time.Now().Add(time.Hour))
	filteredConditions := make([]userv1.Condition, 0, len(user.Status.Conditions)-2)
	for _, condition := range user.Status.Conditions {
		if condition.Type != kubeConfigReadyCondition && condition.Type != roleSyncReadyCondition {
			filteredConditions = append(filteredConditions, condition)
		}
	}
	user.Status.Conditions = filteredConditions
	originalStatus := user.Status.DeepCopy()
	r := &UserReconciler{
		cache:              healthyStartupCache{},
		minRequeueDuration: time.Minute,
	}
	if _, err := r.reconcile(context.Background(), user); err != nil {
		t.Fatalf("reconcile healthy legacy user: %v", err)
	}
	if !reflect.DeepEqual(user.Status, *originalStatus) {
		t.Fatalf(
			"missing conditions were restored for healthy resources: before=%#v after=%#v",
			originalStatus,
			user.Status,
		)
	}
}

func TestKubeConfigSyncFailedConditionForcesRetry(t *testing.T) {
	t.Parallel()
	user := benchmarkProcessedUser("failed-kubeconfig", time.Now().Add(time.Hour))
	for i := range user.Status.Conditions {
		if user.Status.Conditions[i].Type == kubeConfigReadyCondition {
			user.Status.Conditions[i].Status = corev1.ConditionFalse
			break
		}
	}
	if !kubeConfigSyncFailed(user) {
		t.Fatal("failed kubeconfig condition was not detected")
	}

	for _, status := range []corev1.ConditionStatus{
		corev1.ConditionTrue,
		corev1.ConditionUnknown,
	} {
		for i := range user.Status.Conditions {
			if user.Status.Conditions[i].Type == kubeConfigReadyCondition {
				user.Status.Conditions[i].Status = status
				break
			}
		}
		if kubeConfigSyncFailed(user) {
			t.Fatalf("kubeconfig condition %q incorrectly forced a retry", status)
		}
	}
}

func TestBoundTokenSecretMatchesDetectsIdentityDrift(t *testing.T) {
	t.Parallel()
	scheme := reconcileTestScheme(t)
	user := reconcileTestUser("alice")
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:            user.Name,
			Namespace:       config.GetUserSystemNamespace(),
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
		Secrets: []corev1.ObjectReference{{Name: "token-alice"}},
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "token-alice",
			Namespace:       config.GetUserSystemNamespace(),
			UID:             types.UID("secret-a"),
			Annotations:     map[string]string{corev1.ServiceAccountNameKey: user.Name},
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(sa, secret).Build()
	r := &UserReconciler{cache: cli}
	state := &userReconcileState{serviceAccount: sa}
	user.Status.ObservedKubeConfigSecretUID = string(secret.UID)

	if !r.boundTokenSecretMatches(context.Background(), user, state) {
		t.Fatal("matching bound token secret was rejected")
	}

	secret.UID = types.UID("secret-b")
	if err := cli.Update(context.Background(), secret); err != nil {
		t.Fatalf("update recreated secret: %v", err)
	}
	if r.boundTokenSecretMatches(context.Background(), user, state) {
		t.Fatal("recreated bound token secret was accepted with stale UID")
	}

	user.Status.ObservedKubeConfigSecretUID = ""
	if !r.boundTokenSecretMatches(context.Background(), user, state) {
		t.Fatal("legacy user with a valid bound token secret was rejected")
	}
	if user.Status.ObservedKubeConfigSecretUID != "" {
		t.Fatalf(
			"legacy user secret UID was unexpectedly backfilled: got %q",
			user.Status.ObservedKubeConfigSecretUID,
		)
	}

	secret.Annotations[corev1.ServiceAccountNameKey] = "other-user"
	if err := cli.Update(context.Background(), secret); err != nil {
		t.Fatalf("update secret owner annotation: %v", err)
	}
	if r.boundTokenSecretMatches(context.Background(), user, state) {
		t.Fatal("secret bound to another service account was accepted")
	}
}

func TestKubeConfigSyncSkipsSecretUIDRotationForLegacyStatus(t *testing.T) {
	t.Parallel()
	scheme := reconcileTestScheme(t)
	user := benchmarkProcessedUser("alice", time.Now().Add(time.Hour))
	user.Status.ObservedKubeConfigSecretUID = ""
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:            user.Name,
			Namespace:       config.GetUserSystemNamespace(),
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
		Secrets: []corev1.ObjectReference{{Name: "token-alice"}},
	}
	secret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "token-alice",
			Namespace: config.GetUserSystemNamespace(),
			UID:       types.UID("recreated-secret"),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: user.Name,
			},
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(sa, secret).Build()
	r := &UserReconciler{cache: cli}
	state := &userReconcileState{serviceAccount: sa}

	r.syncKubeConfigIfNeeded(context.Background(), user, state)

	if state.kubeConfigSyncAttempted {
		t.Fatal("recreated Secret triggered kubeconfig rotation for legacy status")
	}
	if user.Status.ObservedKubeConfigSecretUID != "" {
		t.Fatalf(
			"legacy status UID was unexpectedly backfilled: %q",
			user.Status.ObservedKubeConfigSecretUID,
		)
	}
}

func TestNewUserStatusNeedsInitialization(t *testing.T) {
	t.Parallel()
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "new-user"}}
	if !(&UserReconciler{}).isNewUser(user) {
		t.Fatal("empty user was not classified as new")
	}
	if !userStatusNeedsSync(user) {
		t.Fatal("new user was classified as already synchronized")
	}
}

func BenchmarkStartupReconcileProcessedUsers100K(b *testing.B) {
	const userCount = 100_000
	refreshAt := time.Now().Add(time.Hour)
	users := make([]*userv1.User, userCount)
	for i := range users {
		users[i] = benchmarkProcessedUser(fmt.Sprintf("user-%d", i), refreshAt)
	}
	reconciler := &UserReconciler{cache: healthyStartupCache{}}
	ctx := context.Background()
	b.ReportAllocs()
	b.ReportMetric(float64(userCount), "users/op")
	b.ResetTimer()
	for range b.N {
		for _, user := range users {
			if _, err := reconciler.reconcile(ctx, user); err != nil {
				b.Fatal(err)
			}
		}
	}
}

func BenchmarkStartupNewUserAfterHistoricalQueue100K(b *testing.B) {
	const historicalUserCount = 100_000
	refreshAt := time.Now().Add(time.Hour)
	historicalUsers := make([]*userv1.User, historicalUserCount)
	for i := range historicalUsers {
		historicalUsers[i] = benchmarkProcessedUser(fmt.Sprintf("user-%d", i), refreshAt)
	}
	newUser := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "new-user"}}
	b.ReportAllocs()
	b.ReportMetric(float64(historicalUserCount+1), "users/op")
	b.ResetTimer()
	for range b.N {
		for _, user := range historicalUsers {
			if userStatusNeedsSync(user) {
				b.Fatalf("historical user %s was classified as needing initialization", user.Name)
			}
		}
		if !userStatusNeedsSync(newUser) {
			b.Fatalf("new user %s was classified as already processed", newUser.Name)
		}
	}
}
