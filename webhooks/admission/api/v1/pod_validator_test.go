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

func TestPodValidator_ValidateCreate(t *testing.T) {
	validator := &PodValidator{}

	tests := []struct {
		name        string
		pod         *corev1.Pod
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid pod with non-zero limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "valid-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "valid-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
					},
				},
			},
			expectError: false,
		},
		{
			name: "pod with zero CPU limit",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-cpu-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-cpu-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'zero-cpu-container'",
		},
		{
			name: "pod with zero memory limit",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-mem-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-mem-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "memory limit cannot be set to '0' for container[0] 'zero-mem-container'",
		},
		{
			name: "pod with both zero CPU and memory limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-both-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-both-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'zero-both-container'",
		},
		{
			name: "pod with no limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "no-limits-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name:      "no-limits-container",
							Resources: corev1.ResourceRequirements{},
						},
					},
				},
			},
			expectError: false,
		},
		{
			name: "pod with init container having zero limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "init-zero-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					InitContainers: []corev1.Container{
						{
							Name: "init-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
					},
					Containers: []corev1.Container{
						{
							Name: "main-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for initContainer[0] 'init-container'",
		},
		{
			name: "pod with multiple containers - second has zero limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "multi-container-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "first-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
						{
							Name: "second-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("64Mi"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[1] 'second-container'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateCreate(context.Background(), tt.pod)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if err.Error() != tt.errorMsg {
					t.Errorf("Expected error message '%s', got '%s'", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error but got: %v", err)
				}
			}
		})
	}
}

func TestPodValidator_ValidateUpdate(t *testing.T) {
	validator := &PodValidator{}

	oldPod := &corev1.Pod{
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
							corev1.ResourceCPU:    resource.MustParse("100m"),
							corev1.ResourceMemory: resource.MustParse("128Mi"),
						},
					},
				},
			},
		},
	}

	tests := []struct {
		name        string
		newPod      *corev1.Pod
		expectError bool
		errorMsg    string
	}{
		{
			name: "update to valid limits",
			newPod: &corev1.Pod{
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
									corev1.ResourceCPU:    resource.MustParse("200m"),
									corev1.ResourceMemory: resource.MustParse("256Mi"),
								},
							},
						},
					},
				},
			},
			expectError: false,
		},
		{
			name: "update to zero CPU limit",
			newPod: &corev1.Pod{
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
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("256Mi"),
								},
							},
						},
					},
				},
			},
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'test-container'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateUpdate(context.Background(), oldPod, tt.newPod)

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if err.Error() != tt.errorMsg {
					t.Errorf("Expected error message '%s', got '%s'", tt.errorMsg, err.Error())
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error but got: %v", err)
				}
			}
		})
	}
}

func TestPodValidator_ValidateDelete(t *testing.T) {
	validator := &PodValidator{}

	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "test-pod",
			Namespace: "ns-test",
		},
	}

	err := validator.ValidateDelete(context.Background(), pod)
	if err != nil {
		t.Errorf("ValidateDelete should never return an error, got: %v", err)
	}
}
