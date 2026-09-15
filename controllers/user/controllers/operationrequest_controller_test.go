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
	"time"

	"github.com/go-logr/logr"
	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/controllers/helper/config"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/types"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestOperationRequestWorkspaceLockSerializesSameWorkspace(t *testing.T) {
	t.Parallel()
	reconciler := &OperationReqReconciler{}
	unlockFirst := reconciler.lockWorkspace("ns-workspace")

	attempting := make(chan struct{})
	acquired := make(chan func(), 1)
	go func() {
		close(attempting)
		acquired <- reconciler.lockWorkspace("ns-workspace")
	}()
	<-attempting

	select {
	case unlock := <-acquired:
		unlock()
		t.Fatal("same workspace lock was acquired concurrently")
	case <-time.After(20 * time.Millisecond):
	}

	unlockFirst()
	select {
	case unlock := <-acquired:
		unlock()
	case <-time.After(time.Second):
		t.Fatal("waiting workspace lock was not released")
	}
}

func TestOperationRequestPersistsDesiredRoleBinding(t *testing.T) {
	t.Parallel()
	for _, action := range []userv1.ActionType{userv1.Grant, userv1.Update} {
		t.Run(string(action), func(t *testing.T) {
			t.Parallel()
			testOperationRequestPersistsDesiredRoleBinding(t, action)
		})
	}
}

func testOperationRequestPersistsDesiredRoleBinding(t *testing.T, action userv1.ActionType) {
	t.Helper()
	scheme := runtime.NewScheme()
	if err := userv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add User scheme: %v", err)
	}
	if err := rbacv1.AddToScheme(scheme); err != nil {
		t.Fatalf("add RBAC scheme: %v", err)
	}

	const (
		workspaceName      = "workspace"
		workspaceNamespace = "ns-workspace"
		memberName         = "member"
	)
	workspace := &userv1.User{ObjectMeta: metav1.ObjectMeta{
		Name: workspaceName,
		Annotations: map[string]string{
			userv1.UserAnnotationOwnerKey: workspaceName,
		},
	}}
	member := &userv1.User{ObjectMeta: metav1.ObjectMeta{
		Name: memberName,
		UID:  types.UID("member-uid"),
	}}
	request := &userv1.Operationrequest{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "change-workspace-owner",
			Namespace:         config.GetUserSystemNamespace(),
			CreationTimestamp: metav1.Now(),
		},
		Spec: userv1.OperationrequestSpec{
			Namespace: workspaceNamespace,
			User:      memberName,
			Role:      userv1.OwnerRoleType,
			Action:    action,
		},
	}
	existing := &rbacv1.RoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name:      config.GetGroupRoleBindingName(memberName),
			Namespace: workspaceNamespace,
		},
		Subjects: []rbacv1.Subject{{Kind: rbacv1.UserKind, Name: "stale"}},
		RoleRef: rbacv1.RoleRef{
			APIGroup: rbacv1.GroupName,
			Kind:     "Role",
			Name:     string(userv1.OwnerRoleType),
		},
	}

	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&userv1.Operationrequest{}).
		WithObjects(workspace, member, request, existing).
		Build()
	storedRequest := &userv1.Operationrequest{}
	requestKey := client.ObjectKeyFromObject(request)
	if err := cli.Get(context.Background(), requestKey, storedRequest); err != nil {
		t.Fatalf("get OperationRequest: %v", err)
	}
	reconciler := &OperationReqReconciler{
		Client:         cli,
		Logger:         logr.Discard(),
		Scheme:         scheme,
		Recorder:       record.NewFakeRecorder(20),
		expirationTime: time.Minute,
		retentionTime:  time.Minute,
	}
	if _, err := reconciler.reconcile(context.Background(), storedRequest); err != nil {
		t.Fatalf("reconcile OperationRequest: %v", err)
	}

	roleBinding := &rbacv1.RoleBinding{}
	roleBindingKey := client.ObjectKey{
		Name:      config.GetGroupRoleBindingName(memberName),
		Namespace: workspaceNamespace,
	}
	if err := cli.Get(context.Background(), roleBindingKey, roleBinding); err != nil {
		t.Fatalf("get RoleBinding: %v", err)
	}
	if roleBinding.RoleRef.Name != string(userv1.OwnerRoleType) ||
		len(roleBinding.Subjects) != 1 || roleBinding.Subjects[0].Name != memberName {
		t.Fatalf("RoleBinding does not match request: %#v", roleBinding)
	}
	controller := metav1.GetControllerOf(roleBinding)
	if controller == nil || controller.Name != memberName || controller.UID != member.UID {
		t.Fatalf("RoleBinding controller = %#v, want member User", controller)
	}

	updatedWorkspace := &userv1.User{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: workspaceName},
		updatedWorkspace,
	); err != nil {
		t.Fatalf("get workspace User: %v", err)
	}
	if updatedWorkspace.Annotations[userv1.UserAnnotationOwnerKey] != memberName {
		t.Fatalf(
			"workspace owner = %q, want %q",
			updatedWorkspace.Annotations[userv1.UserAnnotationOwnerKey],
			memberName,
		)
	}

	updatedRequest := &userv1.Operationrequest{}
	if err := cli.Get(context.Background(), requestKey, updatedRequest); err != nil {
		t.Fatalf("get completed OperationRequest: %v", err)
	}
	if updatedRequest.Status.Phase != userv1.RequestCompleted {
		t.Fatalf("OperationRequest phase = %q, want Completed", updatedRequest.Status.Phase)
	}
}
