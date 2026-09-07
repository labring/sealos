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
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/tools/record"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
	"sigs.k8s.io/controller-runtime/pkg/event"
)

type namespaceCreateErrorClient struct {
	client.Client
}

func (c namespaceCreateErrorClient) Create(
	ctx context.Context,
	obj client.Object,
	opts ...client.CreateOption,
) error {
	if _, ok := obj.(*corev1.Namespace); ok {
		return errors.New("namespace create failed")
	}
	return c.Client.Create(ctx, obj, opts...)
}

type roleSyncErrorClient struct {
	client.Client
}

func (c roleSyncErrorClient) Create(
	ctx context.Context,
	obj client.Object,
	opts ...client.CreateOption,
) error {
	if _, ok := obj.(*rbacv1.Role); ok {
		return errors.New("role create failed")
	}
	return c.Client.Create(ctx, obj, opts...)
}

func (c roleSyncErrorClient) Update(
	ctx context.Context,
	obj client.Object,
	opts ...client.UpdateOption,
) error {
	if _, ok := obj.(*rbacv1.Role); ok {
		return errors.New("role update failed")
	}
	return c.Client.Update(ctx, obj, opts...)
}

type roleBindingSyncErrorClient struct {
	client.Client
}

func (c roleBindingSyncErrorClient) Create(
	ctx context.Context,
	obj client.Object,
	opts ...client.CreateOption,
) error {
	if _, ok := obj.(*rbacv1.RoleBinding); ok {
		return errors.New("role binding create failed")
	}
	return c.Client.Create(ctx, obj, opts...)
}

func TestUpdateStatusPreservesUncachedKubeConfig(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	stored := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{Name: "user-a"},
		Status: userv1.UserStatus{
			Phase:      userv1.UserActive,
			KubeConfig: "existing-kubeconfig",
		},
	}
	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&userv1.User{}).
		WithObjects(stored).
		Build()

	projected := &userv1.User{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(stored),
		projected,
	); err != nil {
		t.Fatalf("get user: %v", err)
	}
	projected.Status.KubeConfig = ""
	originalStatus := projected.Status.DeepCopy()
	projected.Status.ObservedGeneration = 1

	reconciler := &UserReconciler{Client: cli}
	if err := reconciler.updateStatus(context.Background(), projected, originalStatus); err != nil {
		t.Fatalf("patch status: %v", err)
	}

	got := &userv1.User{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(stored), got); err != nil {
		t.Fatalf("get updated user: %v", err)
	}
	if got.Status.KubeConfig != stored.Status.KubeConfig {
		t.Fatalf("kubeconfig = %q, want %q", got.Status.KubeConfig, stored.Status.KubeConfig)
	}
	if got.Status.ObservedGeneration != 1 {
		t.Fatalf("observed generation = %d, want 1", got.Status.ObservedGeneration)
	}
}

func TestOwnerAnnotationChangedPredicate(t *testing.T) {
	t.Parallel()

	oldUser := &userv1.User{ObjectMeta: metav1.ObjectMeta{
		Annotations: map[string]string{
			userv1.UserAnnotationOwnerKey:   "owner-a",
			userv1.UserAnnotationDisplayKey: "old-display",
		},
	}}
	newUser := oldUser.DeepCopy()
	newUser.Annotations[userv1.UserAnnotationDisplayKey] = "new-display"
	predicate := OwnerAnnotationChangedPredicate{}
	if predicate.Update(event.UpdateEvent{ObjectOld: oldUser, ObjectNew: newUser}) {
		t.Fatal("unrelated annotation change triggered reconciliation")
	}

	newUser.Annotations[userv1.UserAnnotationOwnerKey] = "owner-b"
	if !predicate.Update(event.UpdateEvent{ObjectOld: oldUser, ObjectNew: newUser}) {
		t.Fatal("owner annotation change did not trigger reconciliation")
	}
}

func TestDeletionTimestampChangedPredicate(t *testing.T) {
	t.Parallel()

	oldUser := &userv1.User{}
	newUser := oldUser.DeepCopy()
	predicate := DeletionTimestampChangedPredicate{}
	if predicate.Update(event.UpdateEvent{ObjectOld: oldUser, ObjectNew: newUser}) {
		t.Fatal("unchanged deletion timestamp triggered reconciliation")
	}

	now := metav1.Now()
	newUser.DeletionTimestamp = &now
	if !predicate.Update(event.UpdateEvent{ObjectOld: oldUser, ObjectNew: newUser}) {
		t.Fatal("deletion timestamp change did not trigger reconciliation")
	}
}

func TestNamespacePodSecurityPredicate(t *testing.T) {
	t.Parallel()

	oldNamespace := &metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{
		Name: "ns-user-a",
		Labels: map[string]string{
			config.PodSecurityLabelPrefix + "enforce": "baseline",
		},
	}}
	newNamespace := oldNamespace.DeepCopy()
	delete(newNamespace.Labels, config.PodSecurityLabelPrefix+"enforce")
	p := NamespacePodSecurityPredicate{}
	if !p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("Pod Security label deletion did not trigger reconciliation")
	}

	newNamespace = oldNamespace.DeepCopy()
	newNamespace.Labels["unused.example/label"] = "changed"
	if p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("unrelated label change triggered reconciliation")
	}

	newNamespace = oldNamespace.DeepCopy()
	newNamespace.Annotations = map[string]string{userv1.UserAnnotationOwnerKey: "owner-b"}
	if !p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("owner annotation change did not trigger reconciliation")
	}

	newNamespace = oldNamespace.DeepCopy()
	newNamespace.Labels[userv1.UserLabelOwnerKey] = "owner-b"
	if !p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("owner label change did not trigger reconciliation")
	}

	newNamespace = oldNamespace.DeepCopy()
	newNamespace.Annotations = map[string]string{userv1.UserAnnotationCreatorKey: "user-a"}
	if !p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("creator annotation change did not trigger reconciliation")
	}

	newNamespace = oldNamespace.DeepCopy()
	newNamespace.OwnerReferences = []metav1.OwnerReference{{Name: "user-a"}}
	if !p.Update(event.UpdateEvent{ObjectOld: oldNamespace, ObjectNew: newNamespace}) {
		t.Fatal("owner reference change did not trigger reconciliation")
	}

	if !p.Create(event.CreateEvent{Object: oldNamespace}) {
		t.Fatal("ns-* namespace creation did not trigger reconciliation")
	}
	if p.Create(event.CreateEvent{
		Object: &metav1.PartialObjectMetadata{
			ObjectMeta: metav1.ObjectMeta{Name: "kube-system"},
		},
	}) {
		t.Fatal("unmanaged namespace creation triggered reconciliation")
	}
	if !p.Delete(event.DeleteEvent{Object: oldNamespace}) {
		t.Fatal("managed namespace deletion did not trigger reconciliation")
	}
	if p.Delete(event.DeleteEvent{
		Object: &metav1.PartialObjectMetadata{
			ObjectMeta: metav1.ObjectMeta{Name: "kube-system"},
		},
	}) {
		t.Fatal("unmanaged namespace deletion triggered reconciliation")
	}
}

func TestKubeConfigSyncDueUsesPersistedRefreshAt(t *testing.T) {
	t.Parallel()
	r := &UserReconciler{}
	future := metav1.NewTime(time.Now().Add(time.Hour))
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}, Status: userv1.UserStatus{
		KubeConfigRefreshAt: &future,
	}}
	if r.kubeConfigSyncDue(user) {
		t.Fatal("future persisted refresh time was considered due")
	}
	past := metav1.NewTime(time.Now().Add(-time.Second))
	user.Status.KubeConfigRefreshAt = &past
	if !r.kubeConfigSyncDue(user) {
		t.Fatal("past persisted refresh time was not considered due")
	}
	user.Status.KubeConfigRefreshAt = nil
	if !r.kubeConfigSyncDue(user) {
		t.Fatal("missing persisted refresh time was not considered due")
	}
}

func TestCSRExpirationStatusMatchingUsesMinimumForLowValues(t *testing.T) {
	t.Parallel()
	minimum := userv1.DefaultCSRExpirationSeconds
	if !csrExpirationStatusMatches(7_200, 0) {
		t.Fatal("low spec and empty observed expiration should use the minimum")
	}
	if !csrExpirationStatusMatches(7_200, minimum) {
		t.Fatal("low spec and minimum observed expiration should match")
	}
	if csrExpirationStatusMatches(7_200, minimum+1) {
		t.Fatal("low spec should not match a different above-minimum observed expiration")
	}
	if csrExpirationStatusMatches(minimum+1, 7_200) {
		t.Fatal("spec above minimum should detect a different effective expiration")
	}
	if !csrExpirationStatusMatches(minimum+1, minimum+1) {
		t.Fatal("equal above-minimum expirations should match")
	}
}

func TestUserStatusNeedsSyncIgnoresBelowMinimumExpirationDrift(t *testing.T) {
	t.Parallel()
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{Name: "alice", Generation: 1},
		Spec:       userv1.UserSpec{CSRExpirationSeconds: 7_200},
		Status: userv1.UserStatus{
			Phase:                        userv1.UserActive,
			ObservedGeneration:           1,
			ObservedCSRExpirationSeconds: 7_200,
			Conditions: []userv1.Condition{
				{Type: userv1.Initialized, Status: corev1.ConditionTrue},
				{Type: userv1.Ready, Status: corev1.ConditionTrue},
			},
		},
	}
	if userStatusNeedsSync(user) {
		t.Fatal("below-minimum expiration drift triggered a status sync")
	}
	if user.Status.ObservedCSRExpirationSeconds != 7_200 {
		t.Fatalf(
			"observed expiration was normalized outside a kubeconfig refresh: %d",
			user.Status.ObservedCSRExpirationSeconds,
		)
	}
}

func TestSetObservedCSRExpirationSecondsNormalizesOnlyDuringRefresh(t *testing.T) {
	t.Parallel()
	user := &userv1.User{
		Spec: userv1.UserSpec{CSRExpirationSeconds: 7_200},
		Status: userv1.UserStatus{
			ObservedCSRExpirationSeconds: 7_200,
		},
	}
	setObservedCSRExpirationSeconds(user)
	if user.Status.ObservedCSRExpirationSeconds != userv1.DefaultCSRExpirationSeconds {
		t.Fatalf(
			"observed expiration = %d, want minimum %d",
			user.Status.ObservedCSRExpirationSeconds,
			userv1.DefaultCSRExpirationSeconds,
		)
	}

	user.Spec.CSRExpirationSeconds = userv1.DefaultCSRExpirationSeconds + 1
	setObservedCSRExpirationSeconds(user)
	want := userv1.DefaultCSRExpirationSeconds + 1
	if user.Status.ObservedCSRExpirationSeconds != want {
		t.Fatalf(
			"observed expiration = %d, want %d",
			user.Status.ObservedCSRExpirationSeconds,
			want,
		)
	}
}

func TestFailedKubeConfigSyncRetriesImmediately(t *testing.T) {
	t.Parallel()
	r := &UserReconciler{}
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}}
	state := &userReconcileState{kubeConfigSyncAttempted: true}
	state.recordSyncError(errors.New("token request failed"))
	if err := r.finishKubeConfigSync(user, state); err == nil {
		t.Fatal("failed kubeconfig sync did not return its error")
	}
	value, ok := r.nextKubeConfigSync.Load("alice")
	deadline, deadlineOK := value.(time.Time)
	if !ok || !deadlineOK || deadline.After(time.Now()) {
		t.Fatalf("failed kubeconfig sync deadline = %v, want due now", value)
	}
}

func TestSuccessfulKubeConfigSyncUsesPersistedRefreshDeadline(t *testing.T) {
	t.Parallel()
	r := &UserReconciler{}
	refreshAt := metav1.NewTime(time.Now().Add(30 * 24 * time.Hour))
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{Name: "alice"},
		Status: userv1.UserStatus{
			KubeConfigRefreshAt: &refreshAt,
		},
	}
	state := &userReconcileState{
		kubeConfigSyncAttempted: true,
		kubeConfigSynced:        true,
	}

	if err := r.finishKubeConfigSync(user, state); err != nil {
		t.Fatalf("successful kubeconfig sync returned an error: %v", err)
	}
	value, ok := r.nextKubeConfigSync.Load(user.Name)
	deadline, deadlineOK := value.(time.Time)
	if !ok || !deadlineOK {
		t.Fatalf("kubeconfig deadline = %v, want persisted refresh time", value)
	}
	if !deadline.Equal(refreshAt.Time) {
		t.Fatalf("kubeconfig deadline = %s, want %s", deadline, refreshAt.Time)
	}
}

func TestKubeConfigSyncAddsFailureCondition(t *testing.T) {
	t.Parallel()
	refreshAt := metav1.NewTime(time.Now().Add(time.Hour))
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "alice"}}
	user.Status.KubeConfig = "existing-kubeconfig"
	user.Status.KubeConfigRefreshAt = &refreshAt
	user.Status.ObservedCSRExpirationSeconds = userv1.DefaultCSRExpirationSeconds
	r := &UserReconciler{Recorder: record.NewFakeRecorder(1)}
	state := &userReconcileState{}
	r.syncKubeConfig(context.Background(), user, state)
	if state.syncError == nil {
		t.Fatal("kubeconfig sync failure was not recorded")
	}
	condition := helper.GetCondition(
		user.Status.Conditions,
		&userv1.Condition{Type: kubeConfigReadyCondition},
	)
	if condition.Status != corev1.ConditionFalse {
		t.Fatalf("kubeconfig condition status = %s, want False", condition.Status)
	}
	if condition.Reason != "SyncUserError" {
		t.Fatalf("kubeconfig condition reason = %q, want SyncUserError", condition.Reason)
	}
	if user.Status.KubeConfig != "existing-kubeconfig" || user.Status.KubeConfigRefreshAt == nil ||
		!user.Status.KubeConfigRefreshAt.Equal(&refreshAt) ||
		user.Status.ObservedCSRExpirationSeconds != userv1.DefaultCSRExpirationSeconds {
		t.Fatalf("kubeconfig failure cleared existing status: %#v", user.Status)
	}
}

func TestUserResourcesNeedSyncFromReader(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add rbac scheme: %v", err)
	}
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	controller := true
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{
		Name:        "alice",
		UID:         "user-a",
		Annotations: map[string]string{userv1.UserAnnotationOwnerKey: "owner-a"},
	}}
	ownerRef := metav1.OwnerReference{
		APIVersion: userv1.GroupVersion.String(),
		Kind:       "User",
		Name:       user.Name,
		UID:        user.UID,
		Controller: &controller,
	}
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name: config.GetUsersNamespace(user.Name),
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: user.Name,
				userv1.UserAnnotationOwnerKey:   "owner-a",
			},
			Labels: config.SetPodSecurity(
				map[string]string{userv1.UserLabelOwnerKey: "owner-a"},
			),
			OwnerReferences: []metav1.OwnerReference{ownerRef},
		},
	}
	sa := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{
		Name:      user.Name,
		Namespace: config.GetUserSystemNamespace(),
		Annotations: map[string]string{
			userv1.UserAnnotationCreatorKey: user.Name,
			userv1.UserAnnotationOwnerKey:   "owner-a",
		},
		OwnerReferences: []metav1.OwnerReference{ownerRef},
	}, Secrets: []corev1.ObjectReference{{Name: "token-alice"}}}
	secret := &corev1.Secret{ObjectMeta: metav1.ObjectMeta{
		Name: "token-alice", Namespace: config.GetUserSystemNamespace(),
		Annotations:     map[string]string{corev1.ServiceAccountNameKey: user.Name},
		OwnerReferences: []metav1.OwnerReference{ownerRef},
	}}
	objects := make([]client.Object, 0, 8)
	objects = append(objects, user, ns, sa, secret)
	for _, roleType := range []userv1.RoleType{userv1.OwnerRoleType, userv1.ManagerRoleType, userv1.DeveloperRoleType} {
		objects = append(objects, &rbacv1.Role{ObjectMeta: metav1.ObjectMeta{
			Name:      string(roleType),
			Namespace: ns.Name,
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: user.Name,
				userv1.UserAnnotationOwnerKey:   "owner-a",
			},
			OwnerReferences: []metav1.OwnerReference{ownerRef},
		}, Rules: config.GetUserRole(roleType)})
	}
	objects = append(objects, &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      user.Name,
			Namespace: ns.Name,
			Annotations: map[string]string{
				userv1.UserAnnotationCreatorKey: user.Name,
				userv1.UserAnnotationOwnerKey:   "owner-a",
			},
			OwnerReferences: []metav1.OwnerReference{ownerRef},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     string(userv1.OwnerRoleType),
		},
		Subjects: config.GetUsersSubject(user.Name),
	})
	reader := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
	withFinalizer := user.DeepCopy()
	withFinalizer.Finalizers = []string{userFinalizerName}
	withFinalizer.Status = userv1.UserStatus{
		Phase:              userv1.UserActive,
		ObservedGeneration: withFinalizer.Generation,
		Conditions: []userv1.Condition{
			{Type: userv1.Initialized, Status: corev1.ConditionTrue},
			{Type: userv1.Ready, Status: corev1.ConditionTrue},
		},
	}
	if !controllerutil.ContainsFinalizer(withFinalizer, userFinalizerName) {
		t.Fatal("test user finalizer was not configured")
	}
	namespace := &corev1.Namespace{}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: ns.Name},
		namespace,
	); err != nil {
		t.Fatalf("get namespace: %v", err)
	}
	partialNamespace := &metav1.PartialObjectMetadata{ObjectMeta: namespace.ObjectMeta}
	if !namespaceMatchesUser(partialNamespace, user, false) {
		t.Fatal("healthy namespace did not match user")
	}
	serviceAccount := &corev1.ServiceAccount{}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: user.Name, Namespace: config.GetUserSystemNamespace()},
		serviceAccount,
	); err != nil {
		t.Fatalf("get service account: %v", err)
	}
	if !metadataMatchesUserResource(serviceAccount, user) {
		t.Fatal("healthy service account did not match user")
	}
	if !controlledByUser(secret, user) ||
		secret.Annotations[corev1.ServiceAccountNameKey] != user.Name {
		t.Fatal("healthy bound secret did not match user")
	}
	for _, roleType := range []userv1.RoleType{userv1.OwnerRoleType, userv1.ManagerRoleType, userv1.DeveloperRoleType} {
		if !roleMatchesUser(
			context.Background(),
			reader,
			client.ObjectKey{Name: string(roleType), Namespace: ns.Name},
			roleType,
			user,
		) {
			t.Fatalf("healthy %s role did not match user", roleType)
		}
	}
	roleBinding := &rbacv1.RoleBinding{}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: user.Name, Namespace: ns.Name},
		roleBinding,
	); err != nil {
		t.Fatalf("get role binding: %v", err)
	}
	if !roleBindingMatchesUser(roleBinding, user) {
		t.Fatal("healthy role binding did not match user")
	}
	role := &rbacv1.Role{}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: string(userv1.DeveloperRoleType), Namespace: ns.Name},
		role,
	); err != nil {
		t.Fatalf("get developer role: %v", err)
	}
	role.Rules = []rbacv1.PolicyRule{
		{APIGroups: []string{"*"}, Resources: []string{"pods"}, Verbs: []string{"get"}},
	}
	if err := reader.Update(context.Background(), role); err != nil {
		t.Fatalf("update developer role: %v", err)
	}
	if roleMatchesUser(
		context.Background(),
		reader,
		client.ObjectKey{Name: string(userv1.DeveloperRoleType), Namespace: ns.Name},
		userv1.DeveloperRoleType,
		user,
	) {
		t.Fatal("developer role rule drift was not detected")
	}
	role.Rules = config.GetUserRole(userv1.DeveloperRoleType)
	if err := reader.Update(context.Background(), role); err != nil {
		t.Fatalf("restore developer role: %v", err)
	}

	storedNamespace := &corev1.Namespace{}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: ns.Name},
		storedNamespace,
	); err != nil {
		t.Fatalf("get namespace: %v", err)
	}
	storedNamespace.Annotations[userv1.UserAnnotationOwnerKey] = "owner-b"
	if err := reader.Update(context.Background(), storedNamespace); err != nil {
		t.Fatalf("update namespace: %v", err)
	}
	partialNamespace.Annotations = storedNamespace.Annotations
	if namespaceMatchesUser(partialNamespace, user, false) {
		t.Fatal("namespace metadata drift was not detected")
	}
	storedNamespace.Annotations[userv1.UserAnnotationOwnerKey] = "owner-a"
	if err := reader.Update(context.Background(), storedNamespace); err != nil {
		t.Fatalf("restore namespace: %v", err)
	}

	if err := reader.Delete(context.Background(), secret); err != nil {
		t.Fatalf("delete bound secret: %v", err)
	}
	if err := reader.Get(
		context.Background(),
		client.ObjectKey{Name: secret.Name, Namespace: secret.Namespace},
		&corev1.Secret{},
	); err == nil {
		t.Fatal("bound secret drift was not applied")
	}
}

func TestRoleSyncFailureUpdatesRoleCondition(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add RBAC scheme: %v", err)
	}
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{Name: "alice", UID: "user-a"},
	}
	baseClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(user).Build()
	r := &UserReconciler{
		Client:   roleSyncErrorClient{Client: baseClient},
		Scheme:   scheme,
		Recorder: record.NewFakeRecorder(10),
	}
	state := &userReconcileState{}
	r.syncRolesIfNeeded(context.Background(), user, state)
	if state.syncError == nil {
		t.Fatal("role sync failure was not recorded")
	}
	condition := helper.GetCondition(
		user.Status.Conditions,
		&userv1.Condition{Type: roleSyncReadyCondition},
	)
	if condition.Status != corev1.ConditionFalse {
		t.Fatalf("role condition status = %s, want False", condition.Status)
	}
	if condition.Reason != "SyncUserError" {
		t.Fatalf("role condition reason = %q, want SyncUserError", condition.Reason)
	}
}

func TestRoleBindingSyncFailureRecordsRetryableError(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add RBAC scheme: %v", err)
	}
	user := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{Name: "alice", UID: "user-a"},
	}
	baseClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(user).Build()
	r := &UserReconciler{
		Client:   roleBindingSyncErrorClient{Client: baseClient},
		Scheme:   scheme,
		Recorder: record.NewFakeRecorder(10),
	}
	state := &userReconcileState{}
	r.syncRoleBindingIfNeeded(context.Background(), user, state)
	if state.syncError == nil {
		t.Fatal("role binding sync failure was not recorded")
	}
	condition := helper.GetCondition(
		user.Status.Conditions,
		&userv1.Condition{Type: roleBindingReadyCondition},
	)
	if condition.Status != corev1.ConditionFalse {
		t.Fatalf("role binding condition status = %s, want False", condition.Status)
	}
}

func TestNamespaceToUserRequests(t *testing.T) {
	t.Parallel()
	r := &UserReconciler{}
	requests := r.namespaceToUserRequests(context.Background(), &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{Name: "ns-admin"},
	})
	if len(requests) != 1 || requests[0].Name != "admin" {
		t.Fatalf("admin namespace request = %#v", requests)
	}
	if requests := r.namespaceToUserRequests(context.Background(), &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{Name: "kube-system"},
	}); requests != nil {
		t.Fatalf("unmanaged namespace requests = %#v", requests)
	}
}

func TestReconcileStrictNamespacePodSecurity(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
		Name:   "ns-external",
		Labels: map[string]string{"example.com/keep": "value"},
	}}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(ns).Build()
	r := &UserReconciler{Client: cli, EnableStrictNamespacePodSecurity: true}
	if _, err := r.Reconcile(
		context.Background(),
		ctrl.Request{NamespacedName: client.ObjectKey{Name: "external"}},
	); err != nil {
		t.Fatalf("reconcile orphan namespace: %v", err)
	}
	got := &corev1.Namespace{}
	if err := cli.Get(context.Background(), client.ObjectKey{Name: ns.Name}, got); err != nil {
		t.Fatalf("get orphan namespace: %v", err)
	}
	if got.Labels[config.PodSecurityLabelPrefix+"enforce"] != "baseline" ||
		got.Labels["example.com/keep"] != "value" {
		t.Fatalf("orphan namespace labels = %#v", got.Labels)
	}
}

func TestReconcileDisabledStrictNamespacePodSecurityPreservesOrphanLabels(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	ns := &corev1.Namespace{ObjectMeta: metav1.ObjectMeta{
		Name:   "ns-external",
		Labels: map[string]string{config.PodSecurityLabelPrefix + "enforce": "privileged"},
	}}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(ns).Build()
	r := &UserReconciler{Client: cli}
	if _, err := r.Reconcile(
		context.Background(),
		ctrl.Request{NamespacedName: client.ObjectKey{Name: "external"}},
	); err != nil {
		t.Fatalf("reconcile orphan namespace with strict mode disabled: %v", err)
	}
	got := &corev1.Namespace{}
	if err := cli.Get(context.Background(), client.ObjectKey{Name: ns.Name}, got); err != nil {
		t.Fatalf("get orphan namespace: %v", err)
	}
	if got.Labels[config.PodSecurityLabelPrefix+"enforce"] != "privileged" {
		t.Fatalf("orphan namespace labels changed: %#v", got.Labels)
	}
}

func TestAdminClusterRoleBindingPredicate(t *testing.T) {
	t.Parallel()
	p := AdminClusterRoleBindingPredicate{}
	target := &metav1.PartialObjectMetadata{
		ObjectMeta: metav1.ObjectMeta{Name: adminClusterRoleBindingName},
	}
	other := &metav1.PartialObjectMetadata{ObjectMeta: metav1.ObjectMeta{Name: "other-binding"}}
	if !p.Create(event.CreateEvent{Object: target}) ||
		!p.Update(event.UpdateEvent{ObjectNew: target}) ||
		!p.Delete(event.DeleteEvent{Object: target}) {
		t.Fatal("admin cluster role binding events were not accepted")
	}
	if p.Create(event.CreateEvent{Object: other}) ||
		p.Update(event.UpdateEvent{ObjectNew: other}) ||
		p.Delete(event.DeleteEvent{Object: other}) {
		t.Fatal("unrelated cluster role binding event was accepted")
	}
}

func TestDesiredNamespaceLabels(t *testing.T) {
	t.Parallel()
	labels := map[string]string{
		config.PodSecurityLabelPrefix + "enforce": "baseline",
		"example.com/keep":                        "value",
	}
	adminLabels := desiredNamespaceLabels("ns-admin", labels, false)
	if adminLabels[config.PodSecurityLabelPrefix+"enforce"] != "baseline" {
		t.Fatal(
			"admin namespace did not receive Pod Security labels when admin privilege is disabled",
		)
	}
	privilegedLabels := desiredNamespaceLabels("ns-admin", adminLabels, true)
	if _, ok := privilegedLabels[config.PodSecurityLabelPrefix+"enforce"]; ok {
		t.Fatal("admin Pod Security labels were retained when admin privilege is enabled")
	}
	if privilegedLabels["example.com/keep"] != "value" {
		t.Fatal("unrelated namespace label was removed")
	}
}

func TestAdminClusterRoleBindingCleanup(t *testing.T) {
	t.Parallel()
	scheme := runtime.NewScheme()
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add RBAC scheme: %v", err)
	}
	binding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{Name: adminClusterRoleBindingName},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(binding).Build()
	cleanup := &adminPrivilegeMigration{client: cli}
	if err := cleanup.Start(context.Background()); err != nil {
		t.Fatalf("cleanup binding: %v", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: adminClusterRoleBindingName},
		&rbacv1.ClusterRoleBinding{},
	); !apierrors.IsNotFound(
		err,
	) {
		t.Fatalf("binding still exists, get error = %v", err)
	}
}

func TestReconcileMissingAdminCleansDisabledClusterRoleBinding(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		enableAdmin   bool
		bindingExists bool
		wantBinding   bool
	}{
		{
			name:          "disabled admin privilege removes binding",
			bindingExists: true,
		},
		{
			name: "disabled admin privilege tolerates missing binding",
		},
		{
			name:          "enabled admin privilege preserves binding",
			enableAdmin:   true,
			bindingExists: true,
			wantBinding:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			scheme := runtime.NewScheme()
			if err := rbacv1.AddToScheme(scheme); err != nil {
				t.Fatalf("add RBAC scheme: %v", err)
			}
			if err := userv1.AddToScheme(scheme); err != nil {
				t.Fatalf("add user scheme: %v", err)
			}

			var objects []client.Object
			if tt.bindingExists {
				objects = append(objects, &rbacv1.ClusterRoleBinding{
					ObjectMeta: metav1.ObjectMeta{Name: adminClusterRoleBindingName},
				})
			}
			cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(objects...).Build()
			r := &UserReconciler{
				Client:                  cli,
				EnableAdminClusterAdmin: tt.enableAdmin,
			}

			if _, err := r.Reconcile(context.Background(), ctrl.Request{
				NamespacedName: client.ObjectKey{Name: adminUserName},
			}); err != nil {
				t.Fatalf("reconcile missing admin: %v", err)
			}

			err := cli.Get(
				context.Background(),
				client.ObjectKey{Name: adminClusterRoleBindingName},
				&rbacv1.ClusterRoleBinding{},
			)
			if tt.wantBinding {
				if err != nil {
					t.Fatalf("get preserved binding: %v", err)
				}
				return
			}
			if !apierrors.IsNotFound(err) {
				t.Fatalf("binding was not removed, get error = %v", err)
			}
		})
	}
}

func TestAdminPrivilegeMigrationDisablesLegacyBinding(t *testing.T) {
	t.Parallel()
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
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		&userv1.User{ObjectMeta: metav1.ObjectMeta{Name: adminUserName}},
		&rbacv1.ClusterRoleBinding{
			ObjectMeta: metav1.ObjectMeta{Name: adminClusterRoleBindingName},
		},
	).
		Build()
	r := &UserReconciler{Client: cli, Scheme: scheme}
	migration := &adminPrivilegeMigration{
		client:     cli,
		reader:     cli,
		reconciler: r,
	}
	if err := migration.Start(context.Background()); err != nil {
		t.Fatalf("disable admin privilege: %v", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: adminClusterRoleBindingName},
		&rbacv1.ClusterRoleBinding{},
	); !apierrors.IsNotFound(
		err,
	) {
		t.Fatalf("legacy binding still exists, get error = %v", err)
	}
	ns := &corev1.Namespace{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: config.GetUsersNamespace(adminUserName)},
		ns,
	); err != nil {
		t.Fatalf("get admin namespace: %v", err)
	}
	if ns.Labels[config.PodSecurityLabelPrefix+"enforce"] != "baseline" {
		t.Fatalf("admin namespace labels = %#v", ns.Labels)
	}
}

func TestAdminPrivilegeMigrationEnablesLegacyBinding(t *testing.T) {
	t.Parallel()
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
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		&userv1.User{ObjectMeta: metav1.ObjectMeta{Name: adminUserName}},
	).Build()
	r := &UserReconciler{Client: cli, Scheme: scheme, EnableAdminClusterAdmin: true}
	migration := &adminPrivilegeMigration{
		client:                  cli,
		reader:                  cli,
		reconciler:              r,
		enableAdminClusterAdmin: true,
	}
	if err := migration.Start(context.Background()); err != nil {
		t.Fatalf("enable admin privilege: %v", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: adminClusterRoleBindingName},
		&rbacv1.ClusterRoleBinding{},
	); err != nil {
		t.Fatalf("get restored binding: %v", err)
	}
	ns := &corev1.Namespace{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: config.GetUsersNamespace(adminUserName)},
		ns,
	); err != nil {
		t.Fatalf("get admin namespace: %v", err)
	}
	if _, ok := ns.Labels[config.PodSecurityLabelPrefix+"enforce"]; ok {
		t.Fatalf("admin namespace retained Pod Security labels: %#v", ns.Labels)
	}
}

func TestAdminPrivilegeMigrationPropagatesSyncError(t *testing.T) {
	t.Parallel()
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
	baseClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(
		&userv1.User{ObjectMeta: metav1.ObjectMeta{Name: adminUserName}},
	).Build()
	failingClient := namespaceCreateErrorClient{Client: baseClient}
	r := &UserReconciler{
		Client:   failingClient,
		Scheme:   scheme,
		Recorder: record.NewFakeRecorder(10),
	}
	migration := &adminPrivilegeMigration{
		client:                  failingClient,
		reader:                  baseClient,
		reconciler:              r,
		enableAdminClusterAdmin: true,
	}
	if err := migration.Start(context.Background()); err == nil {
		t.Fatal("admin privilege migration reported success after namespace sync failed")
	}
}

func TestPatchUserOwnerPreservesUncachedAnnotations(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add user scheme: %v", err)
	}
	stored := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name: "user-a",
			Annotations: map[string]string{
				userv1.UserAnnotationOwnerKey:   "old-owner",
				userv1.UserAnnotationDisplayKey: "display-name",
			},
		},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(stored).Build()

	projected := &userv1.User{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(stored),
		projected,
	); err != nil {
		t.Fatalf("get user: %v", err)
	}
	projected.Annotations = map[string]string{
		userv1.UserAnnotationOwnerKey: projected.Annotations[userv1.UserAnnotationOwnerKey],
	}

	reconciler := &OperationReqReconciler{Client: cli}
	if err := reconciler.patchUserOwner(context.Background(), projected, "new-owner"); err != nil {
		t.Fatalf("patch user owner: %v", err)
	}

	got := &userv1.User{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(stored), got); err != nil {
		t.Fatalf("get updated user: %v", err)
	}
	if got.Annotations[userv1.UserAnnotationOwnerKey] != "new-owner" {
		t.Fatalf("owner = %q, want new-owner", got.Annotations[userv1.UserAnnotationOwnerKey])
	}
	if got.Annotations[userv1.UserAnnotationDisplayKey] != "display-name" {
		t.Fatalf(
			"display annotation = %q, want display-name",
			got.Annotations[userv1.UserAnnotationDisplayKey],
		)
	}
}
