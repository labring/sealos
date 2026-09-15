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

package finalizer

import (
	"context"
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func TestAddFinalizerResolvesMissingGVK(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	stored := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: "test", Namespace: "default"},
	}
	cli := fake.NewClientBuilder().WithScheme(scheme).WithObjects(stored).Build()

	obj := &corev1.ConfigMap{}
	key := client.ObjectKeyFromObject(stored)
	if err := cli.Get(context.Background(), key, obj); err != nil {
		t.Fatalf("get configmap: %v", err)
	}
	if !obj.GroupVersionKind().Empty() {
		t.Fatalf("fetched object GVK = %s, want empty", obj.GroupVersionKind())
	}

	const finalizerName = "test.sealos.io/finalizer"
	updated, err := NewFinalizer(cli, finalizerName).AddFinalizer(context.Background(), obj)
	if err != nil {
		t.Fatalf("add finalizer: %v", err)
	}
	if !updated {
		t.Fatal("object was not handled")
	}

	got := &corev1.ConfigMap{}
	if err := cli.Get(context.Background(), key, got); err != nil {
		t.Fatalf("get updated configmap: %v", err)
	}
	if !controllerutil.ContainsFinalizer(got, finalizerName) {
		t.Fatalf("finalizers = %v, want %q", got.Finalizers, finalizerName)
	}
}

type updateCountingClient struct {
	client.Client
	updates int
}

func (c *updateCountingClient) Update(
	ctx context.Context,
	obj client.Object,
	opts ...client.UpdateOption,
) error {
	c.updates++
	return c.Client.Update(ctx, obj, opts...)
}

func TestAddFinalizerSkipsExistingFinalizerUpdate(t *testing.T) {
	t.Parallel()

	scheme := runtime.NewScheme()
	if err := corev1.AddToScheme(scheme); err != nil {
		t.Fatalf("add core scheme: %v", err)
	}
	const finalizerName = "test.sealos.io/finalizer"
	stored := &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{
			Name:       "test",
			Namespace:  "default",
			Finalizers: []string{finalizerName},
		},
	}
	baseClient := fake.NewClientBuilder().WithScheme(scheme).WithObjects(stored).Build()
	cli := &updateCountingClient{Client: baseClient}

	obj := &corev1.ConfigMap{}
	if err := cli.Get(context.Background(), client.ObjectKeyFromObject(stored), obj); err != nil {
		t.Fatalf("get configmap: %v", err)
	}
	handled, err := NewFinalizer(cli, finalizerName).AddFinalizer(context.Background(), obj)
	if err != nil {
		t.Fatalf("add finalizer: %v", err)
	}
	if !handled {
		t.Fatal("object was not handled")
	}
	if cli.updates != 0 {
		t.Fatalf("updates = %d, want 0", cli.updates)
	}
}
