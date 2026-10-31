// Copyright © 2026 labring.
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
	"testing"
	"time"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	"github.com/labring/sealos/controllers/user/controllers/helper/kubeconfig"
	"github.com/labring/sealos/controllers/user/pkg/reserved"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func reservedTestReconciler(
	t *testing.T,
	objects ...client.Object,
) (*UserReconciler, client.Client) {
	t.Helper()
	scheme := reconcileTestScheme(t)
	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithObjects(objects...).
		WithStatusSubresource(&userv1.User{}).
		Build()
	return &UserReconciler{
		Client:             cli,
		Scheme:             scheme,
		Recorder:           record.NewFakeRecorder(32),
		cache:              cli,
		minRequeueDuration: time.Minute,
	}, cli
}

func TestReconcileRejectsReservedUserName(t *testing.T) {
	t.Parallel()
	user := reconcileTestUser(reserved.ControllerServiceAccount)
	r, cli := reservedTestReconciler(t, user)

	result, err := r.reconcile(context.Background(), user)
	if err != nil {
		t.Fatalf("reconcile reserved user returned error: %v", err)
	}
	if result.RequeueAfter != time.Minute {
		t.Fatalf("reserved user requeue duration: got %v", result.RequeueAfter)
	}
	if user.Status.Phase != userv1.UserPending {
		t.Fatalf("reserved user phase: got %q", user.Status.Phase)
	}
	condition := helper.GetCondition(
		user.Status.Conditions,
		&userv1.Condition{Type: reservedNameCondition},
	)
	if condition == nil || condition.Status != corev1.ConditionFalse {
		t.Fatalf("reserved user condition missing or not false: %#v", condition)
	}

	for _, object := range []client.Object{
		&corev1.Namespace{},
		&corev1.ServiceAccount{},
	} {
		var key client.ObjectKey
		switch typed := object.(type) {
		case *corev1.Namespace:
			typed.Name = config.GetUsersNamespace(user.Name)
			key = client.ObjectKeyFromObject(typed)
		case *corev1.ServiceAccount:
			typed.Name = user.Name
			typed.Namespace = config.GetUserSystemNamespace()
			key = client.ObjectKeyFromObject(typed)
		}
		if err := cli.Get(context.Background(), key, object); err == nil {
			t.Fatalf("reserved user created %T %v", object, key)
		}
	}
}

func TestSyncServiceAccountRefusesToAdoptForeignServiceAccount(t *testing.T) {
	t.Parallel()
	user := reconcileTestUser("user-controller-manager")
	// The controller's own high-privilege identity, pre-existing and not
	// controlled by any User.
	controllerSA := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      reserved.ControllerServiceAccount,
			Namespace: config.GetUserSystemNamespace(),
			UID:       types.UID("controller-manager-uid"),
		},
	}
	r, cli := reservedTestReconciler(t, controllerSA)

	state := &userReconcileState{}
	r.syncServiceAccount(context.Background(), user, state)

	got := &corev1.ServiceAccount{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(controllerSA),
		got,
	); err != nil {
		t.Fatalf("get controller service account: %v", err)
	}
	if len(got.OwnerReferences) != 0 {
		t.Fatal("foreign service account was adopted with owner references")
	}
	if len(got.Annotations) != 0 {
		t.Fatalf("foreign service account annotations were modified: %#v", got.Annotations)
	}
	if state.serviceAccount != nil {
		t.Fatal("foreign service account was selected for kubeconfig generation")
	}
	condition := helper.GetCondition(
		user.Status.Conditions,
		&userv1.Condition{Type: serviceAccountReadyCondition},
	)
	if condition == nil || condition.Status != corev1.ConditionFalse {
		t.Fatalf("adoption refusal condition missing or not false: %#v", condition)
	}
}

func TestSyncServiceAccountUpdatesOwnedServiceAccount(t *testing.T) {
	t.Parallel()
	user := reconcileTestUser("alice")
	ownedSA := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:            "alice",
			Namespace:       config.GetUserSystemNamespace(),
			UID:             types.UID("alice-sa-uid"),
			OwnerReferences: []metav1.OwnerReference{reconcileTestOwnerReference(user)},
		},
	}
	r, cli := reservedTestReconciler(t, ownedSA)

	state := &userReconcileState{}
	r.syncServiceAccount(context.Background(), user, state)

	if state.serviceAccount == nil {
		t.Fatal("owned service account was not synced")
	}
	got := &corev1.ServiceAccount{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(ownedSA), got); err != nil {
		t.Fatalf("get owned service account: %v", err)
	}
	if !metadataMatchesUserResource(got, user) {
		t.Fatalf("owned service account was not reconciled: %#v", got)
	}
}

func TestSyncServiceAccountRefusesStaleOwnerReference(t *testing.T) {
	t.Parallel()
	// A User that was deleted and recreated keeps the name but not the UID of
	// the User that owned the leftover service account.
	user := reconcileTestUser("alice")
	controller := true
	staleSA := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "alice",
			Namespace: config.GetUserSystemNamespace(),
			UID:       types.UID("alice-sa-uid"),
			OwnerReferences: []metav1.OwnerReference{{
				APIVersion: userv1.GroupVersion.String(),
				Kind:       "User",
				Name:       "alice",
				UID:        types.UID("uid-deleted-alice"),
				Controller: &controller,
			}},
		},
	}
	r, cli := reservedTestReconciler(t, staleSA)

	state := &userReconcileState{}
	r.syncServiceAccount(context.Background(), user, state)

	got := &corev1.ServiceAccount{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(staleSA), got); err != nil {
		t.Fatalf("get stale service account: %v", err)
	}
	if len(got.OwnerReferences) != 1 ||
		got.OwnerReferences[0].UID != types.UID("uid-deleted-alice") {
		t.Fatalf("stale owner reference was overwritten: %#v", got.OwnerReferences)
	}
	if state.serviceAccount != nil {
		t.Fatal("stale service account was selected for kubeconfig generation")
	}
}

func TestDeleteBoundTokenSecretSkipsForeignSecret(t *testing.T) {
	t.Parallel()
	user := reconcileTestUser("bob")
	secretName := kubeconfig.TokenSecretName(user.Name)
	foreignSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: config.GetUserSystemNamespace(),
			UID:       types.UID("secret-uid"),
			Annotations: map[string]string{
				corev1.ServiceAccountNameKey: "alice",
			},
		},
	}
	r, cli := reservedTestReconciler(t, foreignSecret)

	if err := r.deleteBoundTokenSecret(context.Background(), user); err != nil {
		t.Fatalf("delete bound token secret: %v", err)
	}
	got := &corev1.Secret{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(foreignSecret),
		got,
	); err != nil {
		t.Fatalf("foreign bound token secret was deleted: %v", err)
	}

	// Secrets annotated for this user, and legacy secrets without any
	// annotation, must still be deleted.
	foreignSecret.Annotations[corev1.ServiceAccountNameKey] = user.Name
	if err := cli.Update(context.Background(), foreignSecret); err != nil {
		t.Fatalf("rebind secret: %v", err)
	}
	if err := r.deleteBoundTokenSecret(context.Background(), user); err != nil {
		t.Fatalf("delete bound token secret: %v", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(foreignSecret),
		&corev1.Secret{},
	); err == nil {
		t.Fatal("owned bound token secret was kept")
	}

	legacy := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      secretName,
			Namespace: config.GetUserSystemNamespace(),
		},
	}
	if err := cli.Create(context.Background(), legacy); err != nil {
		t.Fatalf("create legacy secret: %v", err)
	}
	if err := r.deleteBoundTokenSecret(context.Background(), user); err != nil {
		t.Fatalf("delete legacy secret: %v", err)
	}
	if err := cli.Get(
		context.Background(),
		client.ObjectKeyFromObject(legacy),
		&corev1.Secret{},
	); err == nil {
		t.Fatal("legacy bound token secret was kept")
	}
}
