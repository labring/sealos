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

package matcher

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

func TestPodMatchExpectations(t *testing.T) {
	expectPod := &corev1.Pod{
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Resources: corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("500m"),
							corev1.ResourceMemory: resource.MustParse("128Mi"),
						},
					},
					Env: []corev1.EnvVar{
						{Name: "ENV_VAR_1", Value: "value1"},
						{Name: "ENV_VAR_2", Value: "value2"},
					},
					Ports: []corev1.ContainerPort{
						{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
						{ContainerPort: 9090, Protocol: corev1.ProtocolTCP},
					},
				},
			},
		},
	}

	tests := []struct {
		name     string
		pod      *corev1.Pod
		expected bool
	}{
		{
			name: "consistent pod",
			pod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
							Env: []corev1.EnvVar{
								{Name: "ENV_VAR_1", Value: "value1"},
								{Name: "ENV_VAR_2", Value: "value2"},
							},
							Ports: []corev1.ContainerPort{
								{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
								{ContainerPort: 9090, Protocol: corev1.ProtocolTCP},
							},
						},
					},
				},
			},
			expected: true,
		},
		{
			name: "inconsistent CPU",
			pod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
							Env: []corev1.EnvVar{
								{Name: "ENV_VAR_1", Value: "value1"},
								{Name: "ENV_VAR_2", Value: "value2"},
							},
							Ports: []corev1.ContainerPort{
								{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
								{ContainerPort: 9090, Protocol: corev1.ProtocolTCP},
							},
						},
					},
				},
			},
			expected: false,
		},
		{
			name: "inconsistent environment variable",
			pod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
							Env: []corev1.EnvVar{
								{Name: "ENV_VAR_1", Value: "value1"},
								{Name: "ENV_VAR_3", Value: "value3"},
							},
							Ports: []corev1.ContainerPort{
								{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
								{ContainerPort: 9090, Protocol: corev1.ProtocolTCP},
							},
						},
					},
				},
			},
			expected: false,
		},
		{
			name: "inconsistent port",
			pod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
							Env: []corev1.EnvVar{
								{Name: "ENV_VAR_1", Value: "value1"},
								{Name: "ENV_VAR_2", Value: "value2"},
							},
							Ports: []corev1.ContainerPort{
								{ContainerPort: 8080, Protocol: corev1.ProtocolTCP},
								{ContainerPort: 9091, Protocol: corev1.ProtocolTCP},
							},
						},
					},
				},
			},
			expected: false,
		},
	}

	matchers := []PodMatcher{
		ResourceMatcher{},
		EnvVarMatcher{},
		PortMatcher{},
		EphemeralStorageMatcher{},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := PodMatchExpectations(expectPod, tt.pod, matchers...)
			if result != tt.expected {
				t.Errorf("CheckPodConsistency() = %v, expected %v", result, tt.expected)
			}
		})
	}
}
