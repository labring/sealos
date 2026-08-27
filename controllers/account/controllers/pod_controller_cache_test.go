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

	accountv1 "github.com/labring/sealos/controllers/account/api/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func TestPatchPodStatusPreservesUncachedFields(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	stored := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{Name: "pod-a", Namespace: "default"},
		Spec: corev1.PodSpec{
			SchedulerName: accountv1.DebtSchedulerName,
			Containers: []corev1.Container{
				{Name: "app", Image: "example/app:latest"},
			},
		},
		Status: corev1.PodStatus{
			Phase: corev1.PodRunning,
			Conditions: []corev1.PodCondition{
				{Type: corev1.PodReady, Status: corev1.ConditionTrue},
			},
		},
	}
	cli := fake.NewClientBuilder().
		WithScheme(scheme).
		WithStatusSubresource(&corev1.Pod{}).
		WithObjects(stored).
		Build()

	projected := &corev1.Pod{
		ObjectMeta: stored.ObjectMeta,
		Spec: corev1.PodSpec{
			SchedulerName: stored.Spec.SchedulerName,
		},
		Status: corev1.PodStatus{Phase: stored.Status.Phase},
	}
	original := projected.DeepCopy()
	projected.Status.Phase = accountv1.PodPhaseSuspended

	reconciler := &PodReconciler{Client: cli}
	if err := reconciler.patchStatus(context.Background(), projected, original); err != nil {
		t.Fatalf("patch pod status: %v", err)
	}

	got := &corev1.Pod{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(stored), got); err != nil {
		t.Fatalf("get updated pod: %v", err)
	}
	if got.Status.Phase != accountv1.PodPhaseSuspended {
		t.Fatalf("phase = %q, want %q", got.Status.Phase, accountv1.PodPhaseSuspended)
	}
	if len(got.Status.Conditions) != len(stored.Status.Conditions) {
		t.Fatalf("conditions = %#v, want %#v", got.Status.Conditions, stored.Status.Conditions)
	}
}
