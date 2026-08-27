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
	"testing"

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/event"
)

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
