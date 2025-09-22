// Copyright © 2024 sealos.
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

package v1

import (
	"context"
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

func TestPodMutator_Default(t *testing.T) {
	mutator := &PodMutator{}

	tests := []struct {
		name        string
		pod         *corev1.Pod
		expectedCPU string
		expectedMem string
	}{
		{
			name: "normal pod with high CPU request - auto adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "test-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"), // Will be adjusted to 100m
									corev1.ResourceMemory: resource.MustParse("256Mi"), // Will be adjusted
								},
							},
						},
					},
				},
			},
			expectedCPU: "100m", // 1000m / 10 = 100m
			expectedMem: "107374182400m", // 1Gi / 10 = 107374182400m
		},
		{
			name: "database pod with high CPU request - auto adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						DatabasePodLabel: DatabasePodValue,
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "db-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("2Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"), // Will be adjusted to 200m
									corev1.ResourceMemory: resource.MustParse("1Gi"), // Will be adjusted
								},
							},
						},
					},
				},
			},
			expectedCPU: "200m", // 1000m / 5 = 200m
			expectedMem: "429496729600m", // 2Gi / 5 = 429496729600m
		},
		{
			name: "pod with no requests - should set max allowed",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "no-request-pod",
					Namespace: "ns-default",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("2000m"),
									corev1.ResourceMemory: resource.MustParse("4Gi"),
								},
							},
						},
					},
				},
			},
			expectedCPU: "200m", // 2000m / 10 = 200m
			expectedMem: "429496729600m", // 4Gi / 10 = 429496729600m
		},
		{
			name: "pod in non-ns namespace - should not be modified",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "system-pod",
					Namespace: "kube-system",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "system-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"), // Should remain unchanged
									corev1.ResourceMemory: resource.MustParse("500Mi"), // Should remain unchanged
								},
							},
						},
					},
				},
			},
			expectedCPU: "500m", // Should not be modified
			expectedMem: "500Mi", // Should not be modified
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mutator.Default(context.Background(), tt.pod)
			if err != nil {
				t.Errorf("PodMutator.Default() error = %v", err)
				return
			}

			container := &tt.pod.Spec.Containers[0]
			actualCPU := container.Resources.Requests[corev1.ResourceCPU]
			actualMem := container.Resources.Requests[corev1.ResourceMemory]

			if actualCPU.String() != tt.expectedCPU {
				t.Errorf("Expected CPU request %s, got %s", tt.expectedCPU, actualCPU.String())
			}

			// For memory, compare the actual values since string representation might vary
			expectedMem := resource.MustParse(tt.expectedMem)
			if !actualMem.Equal(expectedMem) {
				t.Errorf("Expected Memory request %s (%d), got %s (%d)",
					tt.expectedMem, expectedMem.Value(),
					actualMem.String(), actualMem.Value())
			}
		})
	}
}

func TestPodMutator_getOversellRatio(t *testing.T) {
	mutator := &PodMutator{}

	tests := []struct {
		name     string
		pod      *corev1.Pod
		expected int
	}{
		{
			name: "normal pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "normal-pod",
				},
			},
			expected: DefaultOversellRatio,
		},
		{
			name: "database pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "db-pod",
					Labels: map[string]string{
						DatabasePodLabel: DatabasePodValue,
					},
				},
			},
			expected: DatabaseOversellRatio,
		},
		{
			name: "pod with wrong label value",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "wrong-label-pod",
					Labels: map[string]string{
						DatabasePodLabel: "not-database",
					},
				},
			},
			expected: DefaultOversellRatio,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := mutator.getOversellRatio(tt.pod)
			if actual != tt.expected {
				t.Errorf("getOversellRatio() = %v, want %v", actual, tt.expected)
			}
		})
	}
}
