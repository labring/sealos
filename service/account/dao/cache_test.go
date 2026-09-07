/*
Copyright 2026.

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

package dao

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestTransformNamespaceKeepsServiceFields(t *testing.T) {
	ns := &corev1.Namespace{
		ObjectMeta: metav1.ObjectMeta{
			Name:   "ns-a",
			Labels: map[string]string{UserOwnerLabel: "owner-a"},
			Annotations: map[string]string{
				"subscription.sealos.io/status": "Normal",
				"unused.example/key":            "large-value",
			},
			ManagedFields: []metav1.ManagedFieldsEntry{{Manager: "test"}},
		},
		Spec: corev1.NamespaceSpec{Finalizers: []corev1.FinalizerName{"kubernetes"}},
		Status: corev1.NamespaceStatus{
			Phase:      corev1.NamespaceActive,
			Conditions: []corev1.NamespaceCondition{{Type: corev1.NamespaceDeletionContentFailure}},
		},
	}

	transformed, err := transformNamespace(ns)
	if err != nil {
		t.Fatalf("transform namespace: %v", err)
	}
	got, ok := transformed.(*corev1.Namespace)
	if !ok {
		t.Fatalf("transformed type = %T, want *corev1.Namespace", transformed)
	}
	if got.Name != ns.Name ||
		got.Labels[UserOwnerLabel] != "owner-a" ||
		len(got.Annotations) == 0 {
		t.Fatalf("service metadata was not retained: %#v", got.ObjectMeta)
	}
	if _, ok := got.Annotations["unused.example/key"]; ok {
		t.Fatalf("unused annotation was retained: %#v", got.Annotations)
	}
	if got.Status.Phase != corev1.NamespaceActive {
		t.Fatalf("phase = %q, want %q", got.Status.Phase, corev1.NamespaceActive)
	}
	if len(got.Spec.Finalizers) != len(ns.Spec.Finalizers) ||
		len(got.Status.Conditions) != 0 ||
		len(got.ManagedFields) != 0 {
		t.Fatalf("unused namespace fields were retained: %#v", got)
	}
}
