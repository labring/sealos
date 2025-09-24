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

const (
	// Default oversell ratio values
	defaultOversellRatio = 10 // 10x oversell for normal pods
	defaultDatabaseRatio = 5  // 5x oversell for database pods
)

func TestPodMutator_Default(t *testing.T) {
	mutator := &PodMutator{
		DefaultOversellRatio:  defaultOversellRatio,
		DatabaseOversellRatio: defaultDatabaseRatio,
	}

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
									corev1.ResourceCPU: resource.MustParse(
										"500m",
									), // Will be adjusted to 100m
									corev1.ResourceMemory: resource.MustParse(
										"256Mi",
									), // Will be adjusted
								},
							},
						},
					},
				},
			},
			expectedCPU: "100m",          // 1000m / 10 = 100m
			expectedMem: "107374182400m", // 1Gi / 10 = 107374182400m
		},
		{
			name: "database pod with high CPU request - auto adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
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
									corev1.ResourceCPU: resource.MustParse(
										"500m",
									), // Will be adjusted to 200m
									corev1.ResourceMemory: resource.MustParse(
										"1Gi",
									), // Will be adjusted
								},
							},
						},
					},
				},
			},
			expectedCPU: "200m",          // 1000m / 5 = 200m
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
			expectedCPU: "200m",          // 2000m / 10 = 200m
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
									corev1.ResourceCPU: resource.MustParse(
										"500m",
									), // Should remain unchanged
									corev1.ResourceMemory: resource.MustParse(
										"500Mi",
									), // Should remain unchanged
								},
							},
						},
					},
				},
			},
			expectedCPU: "500m",  // Should not be modified
			expectedMem: "500Mi", // Should not be modified
		},
		{
			name: "normal pod with low CPU request - should not be adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "low-request-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "low-request-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU: resource.MustParse(
										"50m",
									), // Already below limit/oversell ratio (1000m/10=100m)
									corev1.ResourceMemory: resource.MustParse(
										"50Mi",
									), // Already below limit/oversell ratio (1Gi/10)
								},
							},
						},
					},
				},
			},
			expectedCPU: "50m",  // Should remain unchanged as it's below 100m
			expectedMem: "50Mi", // Should remain unchanged as it's below ~107Mi
		},
		{
			name: "database pod with low CPU request - should not be adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-low-request-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "db-low-request-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU: resource.MustParse(
										"100m",
									), // Already below limit/database ratio (1000m/5=200m)
									corev1.ResourceMemory: resource.MustParse(
										"100Mi",
									), // Already below limit/database ratio (1Gi/5)
								},
							},
						},
					},
				},
			},
			expectedCPU: "100m",  // Should remain unchanged as it's below 200m
			expectedMem: "100Mi", // Should remain unchanged as it's below ~214Mi
		},
		{
			name: "normal pod with request equal to oversell limit - should not be adjusted",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "equal-request-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "equal-request-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU: resource.MustParse(
										"100m",
									), // Exactly equal to limit/oversell ratio (1000m/10=100m)
									corev1.ResourceMemory: resource.MustParse(
										"107374182400m",
									), // Exactly equal to limit/oversell ratio (1Gi/10)
								},
							},
						},
					},
				},
			},
			expectedCPU: "100m",          // Should remain unchanged as it equals the oversell limit
			expectedMem: "107374182400m", // Should remain unchanged as it equals the oversell limit
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
	mutator := &PodMutator{
		DefaultOversellRatio:  defaultOversellRatio,
		DatabaseOversellRatio: defaultDatabaseRatio,
	}

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
			expected: defaultOversellRatio,
		},
		{
			name: "kubeblocks database pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "kb-db-pod",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
			},
			expected: defaultDatabaseRatio,
		},
		{
			name: "pod with only managed-by label",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "partial-label-pod",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
					},
				},
			},
			expected: defaultOversellRatio,
		},
		{
			name: "pod with wrong managed-by value",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name: "wrong-managed-by-pod",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: "helm",
						KubeBlocksComponentLabel: "mysql",
					},
				},
			},
			expected: defaultOversellRatio,
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

func TestPodMutator_DatabasePodFirstContainerOnly(t *testing.T) {
	mutator := &PodMutator{
		DefaultOversellRatio:  defaultOversellRatio,
		DatabaseOversellRatio: defaultDatabaseRatio,
	}

	tests := []struct {
		name                  string
		pod                   *corev1.Pod
		expectedFirstCPU      string
		expectedFirstMem      string
		expectedSecondCPU     string
		expectedSecondMem     string
		firstContainerMutated bool
	}{
		{
			name: "database pod with multiple containers - only first should be mutated",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "multi-container-db-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "mysql-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
							},
						},
						{
							Name: "sidecar-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("200m"),
									corev1.ResourceMemory: resource.MustParse("200Mi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("100m"),
									corev1.ResourceMemory: resource.MustParse("100Mi"),
								},
							},
						},
					},
				},
			},
			expectedFirstCPU:      "200m",          // 1000m / 5 = 200m
			expectedFirstMem:      "214748364800m", // 1Gi / 5
			expectedSecondCPU:     "100m",          // Should remain unchanged
			expectedSecondMem:     "100Mi",         // Should remain unchanged
			firstContainerMutated: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := mutator.Default(context.Background(), tt.pod)
			if err != nil {
				t.Errorf("PodMutator.Default() error = %v", err)
				return
			}

			// First container checks
			firstContainer := &tt.pod.Spec.Containers[0]
			expectedCPU := resource.MustParse(tt.expectedFirstCPU)
			expectedMem := resource.MustParse(tt.expectedFirstMem)

			actualCPU := firstContainer.Resources.Requests[corev1.ResourceCPU]
			actualMem := firstContainer.Resources.Requests[corev1.ResourceMemory]

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("First container CPU request should be mutated. Expected %s, got %s",
					expectedCPU.String(),
					actualCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("First container Memory request should be mutated. Expected %s, got %s",
					expectedMem.String(),
					actualMem.String())
			}

			// Second container checks
			secondContainer := &tt.pod.Spec.Containers[1]
			expectedSecondCPU := resource.MustParse(tt.expectedSecondCPU)
			expectedSecondMem := resource.MustParse(tt.expectedSecondMem)

			actualSecondCPU := secondContainer.Resources.Requests[corev1.ResourceCPU]
			actualSecondMem := secondContainer.Resources.Requests[corev1.ResourceMemory]

			if !actualSecondCPU.Equal(expectedSecondCPU) {
				t.Errorf("Second container CPU request should NOT be mutated. Expected %s, got %s",
					expectedSecondCPU.String(),
					actualSecondCPU.String())
			}

			if !actualSecondMem.Equal(expectedSecondMem) {
				t.Errorf(
					"Second container Memory request should NOT be mutated. Expected %s, got %s",
					expectedSecondMem.String(),
					actualSecondMem.String(),
				)
			}
		})
	}
}

func TestPodMutator_DefaultValues(t *testing.T) {
	mutator := &PodMutator{
		DefaultOversellRatio:  defaultOversellRatio,
		DatabaseOversellRatio: defaultDatabaseRatio,
	}

	if mutator.DefaultOversellRatio != 10 {
		t.Errorf("Expected DefaultOversellRatio to be 10, got %d", mutator.DefaultOversellRatio)
	}

	if mutator.DatabaseOversellRatio != 5 {
		t.Errorf("Expected DatabaseOversellRatio to be 5, got %d", mutator.DatabaseOversellRatio)
	}
}

func TestNewPodMutatorWithRatios(t *testing.T) {
	mutator := NewPodMutatorWithRatios(20, 8)

	if mutator.DefaultOversellRatio != 20 {
		t.Errorf("Expected DefaultOversellRatio to be 20, got %d", mutator.DefaultOversellRatio)
	}

	if mutator.DatabaseOversellRatio != 8 {
		t.Errorf("Expected DatabaseOversellRatio to be 8, got %d", mutator.DatabaseOversellRatio)
	}
}

func TestPodMutator_CustomRatios(t *testing.T) {
	// Test with custom ratios: 15x for normal pods, 3x for database pods
	mutator := NewPodMutatorWithRatios(15, 3)

	// Test normal pod
	normalPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "normal-pod",
			Namespace: "ns-test",
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name: "test-container",
					Resources: corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1500m"),
							corev1.ResourceMemory: resource.MustParse("3Gi"),
						},
					},
				},
			},
		},
	}

	err := mutator.Default(context.Background(), normalPod)
	if err != nil {
		t.Errorf("PodMutator.Default() error = %v", err)
		return
	}

	// Expected: 1500m / 15 = 100m, 3Gi / 15
	expectedCPU := resource.MustParse("100m")
	actualCPU := normalPod.Spec.Containers[0].Resources.Requests[corev1.ResourceCPU]
	if !actualCPU.Equal(expectedCPU) {
		t.Errorf("Expected CPU request %s, got %s", expectedCPU.String(), actualCPU.String())
	}

	// Test database pod
	dbPod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "db-pod",
			Namespace: "ns-database",
			Labels: map[string]string{
				KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
				KubeBlocksComponentLabel: "mysql",
			},
		},
		Spec: corev1.PodSpec{
			Containers: []corev1.Container{
				{
					Name: "db-container",
					Resources: corev1.ResourceRequirements{
						Limits: corev1.ResourceList{
							corev1.ResourceCPU:    resource.MustParse("1500m"),
							corev1.ResourceMemory: resource.MustParse("3Gi"),
						},
					},
				},
			},
		},
	}

	err = mutator.Default(context.Background(), dbPod)
	if err != nil {
		t.Errorf("PodMutator.Default() error = %v", err)
		return
	}

	// Expected: 1500m / 3 = 500m
	expectedDBCPU := resource.MustParse("500m")
	actualDBCPU := dbPod.Spec.Containers[0].Resources.Requests[corev1.ResourceCPU]
	if !actualDBCPU.Equal(expectedDBCPU) {
		t.Errorf(
			"Expected database CPU request %s, got %s",
			expectedDBCPU.String(),
			actualDBCPU.String(),
		)
	}
}

func TestNewPodMutatorWithThresholds(t *testing.T) {
	tests := []struct {
		name                    string
		defaultRatio            int
		databaseRatio           int
		skipCPUThreshold        string
		skipMemoryThreshold     string
		expectedCPUThreshold    *string
		expectedMemoryThreshold *string
	}{
		{
			name:                    "valid thresholds",
			defaultRatio:            10,
			databaseRatio:           5,
			skipCPUThreshold:        "100m",
			skipMemoryThreshold:     "128Mi",
			expectedCPUThreshold:    stringPtr("100m"),
			expectedMemoryThreshold: stringPtr("128Mi"),
		},
		{
			name:                    "empty thresholds",
			defaultRatio:            15,
			databaseRatio:           3,
			skipCPUThreshold:        "",
			skipMemoryThreshold:     "",
			expectedCPUThreshold:    nil,
			expectedMemoryThreshold: nil,
		},
		{
			name:                    "invalid CPU threshold",
			defaultRatio:            10,
			databaseRatio:           5,
			skipCPUThreshold:        "invalid",
			skipMemoryThreshold:     "256Mi",
			expectedCPUThreshold:    nil,
			expectedMemoryThreshold: stringPtr("256Mi"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mutator := NewPodMutatorWithThresholds(
				tt.defaultRatio,
				tt.databaseRatio,
				tt.skipCPUThreshold,
				tt.skipMemoryThreshold,
			)

			if mutator.DefaultOversellRatio != tt.defaultRatio {
				t.Errorf("Expected DefaultOversellRatio %d, got %d", tt.defaultRatio, mutator.DefaultOversellRatio)
			}

			if mutator.DatabaseOversellRatio != tt.databaseRatio {
				t.Errorf("Expected DatabaseOversellRatio %d, got %d", tt.databaseRatio, mutator.DatabaseOversellRatio)
			}

			if tt.expectedCPUThreshold == nil {
				if mutator.SkipCPUThreshold != nil {
					t.Errorf("Expected CPU threshold to be nil, got %v", mutator.SkipCPUThreshold)
				}
			} else {
				if mutator.SkipCPUThreshold == nil {
					t.Errorf("Expected CPU threshold to be set, got nil")
				} else {
					expected := resource.MustParse(*tt.expectedCPUThreshold)
					if !mutator.SkipCPUThreshold.Equal(expected) {
						t.Errorf("Expected CPU threshold %s, got %s", expected.String(), mutator.SkipCPUThreshold.String())
					}
				}
			}

			if tt.expectedMemoryThreshold == nil {
				if mutator.SkipMemoryThreshold != nil {
					t.Errorf("Expected memory threshold to be nil, got %v", mutator.SkipMemoryThreshold)
				}
			} else {
				if mutator.SkipMemoryThreshold == nil {
					t.Errorf("Expected memory threshold to be set, got nil")
				} else {
					expected := resource.MustParse(*tt.expectedMemoryThreshold)
					if !mutator.SkipMemoryThreshold.Equal(expected) {
						t.Errorf("Expected memory threshold %s, got %s", expected.String(), mutator.SkipMemoryThreshold.String())
					}
				}
			}
		})
	}
}

func TestPodMutator_ThresholdSkipping(t *testing.T) {
	skipCPUThreshold := resource.MustParse("100m")
	skipMemoryThreshold := resource.MustParse("128Mi")

	mutator := &PodMutator{
		DefaultOversellRatio:    10,
		DatabaseOversellRatio:   5,
		SkipCPUThreshold:        &skipCPUThreshold,
		SkipMemoryThreshold:     &skipMemoryThreshold,
	}

	tests := []struct {
		name                string
		pod                 *corev1.Pod
		expectedCPU         string
		expectedMem         string
		shouldSkipCPU       bool
		shouldSkipMemory    bool
		description         string
	}{
		{
			name: "CPU limit below threshold - should skip CPU mutation",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "low-cpu-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "test-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("50m"), // Below 100m threshold
									corev1.ResourceMemory: resource.MustParse("1Gi"),  // Above 128Mi threshold
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("25m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:      "25m",            // Should not be mutated
			expectedMem:      "107374182400m",  // Should be mutated: 1Gi / 10
			shouldSkipCPU:    true,
			shouldSkipMemory: false,
			description:      "CPU below threshold should not be mutated, memory should be",
		},
		{
			name: "Memory limit below threshold - should skip memory mutation",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "low-mem-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "test-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"), // Above 100m threshold
									corev1.ResourceMemory: resource.MustParse("64Mi"), // Below 128Mi threshold
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("250m"),
									corev1.ResourceMemory: resource.MustParse("32Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:      "50m",  // Should be mutated: 500m / 10 = 50m
			expectedMem:      "32Mi", // Should not be mutated
			shouldSkipCPU:    false,
			shouldSkipMemory: true,
			description:      "Memory below threshold should not be mutated, CPU should be",
		},
		{
			name: "Both limits below thresholds - should skip both mutations",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "both-low-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "test-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("80m"),  // Below 100m threshold
									corev1.ResourceMemory: resource.MustParse("100Mi"), // Below 128Mi threshold
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("40m"),
									corev1.ResourceMemory: resource.MustParse("50Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:      "40m",  // Should not be mutated
			expectedMem:      "50Mi", // Should not be mutated
			shouldSkipCPU:    true,
			shouldSkipMemory: true,
			description:      "Both resources below thresholds should not be mutated",
		},
		{
			name: "Both limits above thresholds - should mutate both",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "both-high-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "test-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"), // Above 100m threshold
									corev1.ResourceMemory: resource.MustParse("1Gi"),   // Above 128Mi threshold
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("512Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:      "100m",           // Should be mutated: 1000m / 10 = 100m
			expectedMem:      "107374182400m",  // Should be mutated: 1Gi / 10
			shouldSkipCPU:    false,
			shouldSkipMemory: false,
			description:      "Both resources above thresholds should be mutated",
		},
		{
			name: "Database pod with limits below threshold",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-low-limits-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "db-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("80m"),  // Below 100m threshold
									corev1.ResourceMemory: resource.MustParse("100Mi"), // Below 128Mi threshold
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("40m"),
									corev1.ResourceMemory: resource.MustParse("50Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:      "40m",  // Should not be mutated (database ratio irrelevant when skipped)
			expectedMem:      "50Mi", // Should not be mutated
			shouldSkipCPU:    true,
			shouldSkipMemory: true,
			description:      "Database pod with resources below thresholds should not be mutated",
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

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("%s: CPU request mismatch. Expected %s, got %s",
					tt.description, expectedCPU.String(), actualCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("%s: Memory request mismatch. Expected %s, got %s",
					tt.description, expectedMem.String(), actualMem.String())
			}
		})
	}
}

func stringPtr(s string) *string {
	return &s
}

func TestPodMutator_ZeroLimits(t *testing.T) {
	mutator := &PodMutator{
		DefaultOversellRatio:  defaultOversellRatio,
		DatabaseOversellRatio: defaultDatabaseRatio,
	}

	tests := []struct {
		name        string
		pod         *corev1.Pod
		expectedCPU string
		expectedMem string
		description string
	}{
		{
			name: "pod with zero CPU and memory limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-limits-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-limits-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
							},
						},
					},
				},
			},
			expectedCPU: "0", // Should remain 0 when CPU limit is zero
			expectedMem: "0", // Should remain 0 when memory limit is zero
			description: "should not mutate when limits are zero",
		},
		{
			name: "pod with zero CPU limit only",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-cpu-limit-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-cpu-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("128Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU: "0",             // Should remain 0 when CPU limit is zero
			expectedMem: "107374182400m", // Memory should be mutated: 1Gi / 10
			description: "should mutate memory but not CPU when CPU limit is zero",
		},
		{
			name: "pod with zero memory limit only",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-mem-limit-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "zero-mem-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("500m"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
							},
						},
					},
				},
			},
			expectedCPU: "100m", // CPU should be mutated: 1000m / 10 = 100m
			expectedMem: "0",    // Should remain 0 when memory limit is zero
			description: "should mutate CPU but not memory when memory limit is zero",
		},
		{
			name: "database pod with zero limits",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-zero-limits-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "db-zero-container",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("0"),
									corev1.ResourceMemory: resource.MustParse("0"),
								},
							},
						},
					},
				},
			},
			expectedCPU: "0", // Should remain 0 when CPU limit is zero
			expectedMem: "0", // Should remain 0 when memory limit is zero
			description: "database pod should not mutate when limits are zero",
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
			actualCPURequest := container.Resources.Requests[corev1.ResourceCPU]
			actualMemRequest := container.Resources.Requests[corev1.ResourceMemory]

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPURequest.Equal(expectedCPU) {
				t.Errorf(
					"%s: CPU request mismatch. Expected %s, got %s",
					tt.description,
					expectedCPU.String(),
					actualCPURequest.String(),
				)
			}

			if !actualMemRequest.Equal(expectedMem) {
				t.Errorf(
					"%s: Memory request mismatch. Expected %s, got %s",
					tt.description,
					expectedMem.String(),
					actualMemRequest.String(),
				)
			}
		})
	}
}
