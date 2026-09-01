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

	userv1 "github.com/labring/sealos/controllers/user/api/v1"
	"github.com/labring/sealos/controllers/user/pkg/licensegate"
	"github.com/labring/sealos/controllers/user/pkg/usercount"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/record"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/controller/priorityqueue"
	"sigs.k8s.io/controller-runtime/pkg/event"
	"sigs.k8s.io/controller-runtime/pkg/reconcile"
)

func TestUserEventHandlerPrioritizesIncompleteUsers(t *testing.T) {
	historical := metav1.NewTime(time.Now().Add(-time.Hour))
	newUser := &userv1.User{
		ObjectMeta: metav1.ObjectMeta{
			Name:              "new-user",
			Generation:        1,
			CreationTimestamp: historical,
		},
	}
	failedUser := benchmarkProcessedUser("failed-user", time.Now().Add(time.Hour))
	failedUser.CreationTimestamp = historical
	for i := range failedUser.Status.Conditions {
		if failedUser.Status.Conditions[i].Type == userv1.Ready {
			failedUser.Status.Conditions[i].Status = corev1.ConditionFalse
		}
	}
	healthyUser := benchmarkProcessedUser("healthy-user", time.Now().Add(time.Hour))
	healthyUser.CreationTimestamp = historical

	tests := []struct {
		name     string
		user     *userv1.User
		priority int
	}{
		{name: "new", user: newUser, priority: 0},
		{name: "failed", user: failedUser, priority: 0},
		{name: "healthy historical", user: healthyUser, priority: -100},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			q := priorityqueue.New[reconcile.Request]("user-event-test")
			t.Cleanup(q.ShutDown)
			userEventHandler{}.Create(
				context.Background(),
				event.CreateEvent{Object: tt.user},
				q,
			)

			request, priority, shutdown := q.GetWithPriority()
			if shutdown {
				t.Fatal("priority queue shut down before delivering User")
			}
			q.Done(request)
			if request.Name != tt.user.Name {
				t.Fatalf("request name = %q, want %q", request.Name, tt.user.Name)
			}
			if priority != tt.priority {
				t.Fatalf("priority = %d, want %d", priority, tt.priority)
			}
		})
	}
}

func TestUserEventHandlerUpdatePromotesQueuedUser(t *testing.T) {
	t.Parallel()

	user := benchmarkProcessedUser("healthy-user", time.Now().Add(time.Hour))
	user.CreationTimestamp = metav1.NewTime(time.Now().Add(-time.Hour))
	updated := user.DeepCopy()
	updated.Generation++
	updated.ResourceVersion = "2"

	q := priorityqueue.New[reconcile.Request]("user-event-promotion-test")
	t.Cleanup(q.ShutDown)
	handler := userEventHandler{}
	handler.Create(context.Background(), event.CreateEvent{Object: user}, q)
	handler.Update(context.Background(), event.UpdateEvent{
		ObjectOld: user,
		ObjectNew: updated,
	}, q)

	request, priority, shutdown := q.GetWithPriority()
	if shutdown {
		t.Fatal("priority queue shut down before delivering User")
	}
	q.Done(request)
	if priority != 0 {
		t.Fatalf("promoted priority = %d, want 0", priority)
	}
}

func TestAddUserRequestUsesCallerPriority(t *testing.T) {
	t.Parallel()

	q := priorityqueue.New[reconcile.Request]("user-event-custom-priority-test")
	t.Cleanup(q.ShutDown)
	user := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "custom-priority"}}

	addUserRequest(q, user, 42)
	request, priority, shutdown := q.GetWithPriority()
	if shutdown {
		t.Fatal("priority queue shut down before delivering User")
	}
	q.Done(request)
	if request.Name != user.Name {
		t.Fatalf("request name = %q, want %q", request.Name, user.Name)
	}
	if priority != 42 {
		t.Fatalf("priority = %d, want caller priority 42", priority)
	}
}

func TestIgnorePreStartCreatePredicate(t *testing.T) {
	t.Parallel()

	startedAt := time.Unix(1_000, 0)
	predicate := ignorePreStartCreatePredicate{startedAt: startedAt}
	tests := []struct {
		name      string
		createdAt time.Time
		want      bool
	}{
		{name: "before controller start", createdAt: startedAt.Add(-time.Nanosecond)},
		{name: "at controller start", createdAt: startedAt, want: true},
		{name: "after controller start", createdAt: startedAt.Add(time.Second), want: true},
		{name: "missing timestamp", want: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			obj := &corev1.ServiceAccount{ObjectMeta: metav1.ObjectMeta{
				CreationTimestamp: metav1.NewTime(tt.createdAt),
			}}
			if got := predicate.Create(event.CreateEvent{Object: obj}); got != tt.want {
				t.Fatalf("Create() = %t, want %t", got, tt.want)
			}
		})
	}
	if predicate.Create(event.CreateEvent{}) {
		t.Fatal("nil Create object was accepted")
	}
}

func TestLicenseLimitedUserRemainsNewAcrossRestart(t *testing.T) {
	scheme := reconcileTestScheme(t)
	stored := &userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "new-user", Generation: 1}}
	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&userv1.User{}).
		WithObjects(stored).
		Build()

	counter := usercount.NewCounter()
	counter.Add(&userv1.User{ObjectMeta: metav1.ObjectMeta{Name: "existing-user"}})
	counter.MarkInitialized()
	licensegate.SetState(true, 1)
	t.Cleanup(func() {
		licensegate.SetState(false, licensegate.DefaultUserLimit)
	})

	r := &UserReconciler{
		Client:      cli,
		Recorder:    record.NewFakeRecorder(2),
		userCounter: counter,
	}
	user := &userv1.User{}
	if err := cli.Get(context.Background(), client.ObjectKey{Name: stored.Name}, user); err != nil {
		t.Fatalf("get new User: %v", err)
	}
	blocked, err := r.handleLicenseLimit(
		context.Background(),
		user,
		user.Status.DeepCopy(),
	)
	if err != nil {
		t.Fatalf("apply license limit: %v", err)
	}
	if !blocked {
		t.Fatal("license-limited User was not blocked")
	}

	restartedUser := &userv1.User{}
	if err := cli.Get(
		context.Background(),
		client.ObjectKey{Name: stored.Name},
		restartedUser,
	); err != nil {
		t.Fatalf("get persisted User status: %v", err)
	}
	if !r.isNewUser(restartedUser) {
		t.Fatalf("license-limited User was classified as old: %#v", restartedUser.Status)
	}
	blocked, err = r.handleLicenseLimit(
		context.Background(),
		restartedUser,
		restartedUser.Status.DeepCopy(),
	)
	if err != nil {
		t.Fatalf("retry license limit: %v", err)
	}
	if !blocked {
		t.Fatal("license-limited User was allowed before capacity became available")
	}
}
