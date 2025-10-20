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

	appsv1 "k8s.io/api/apps/v1"
	authenticationv1 "k8s.io/api/authentication/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	admissionv1 "k8s.io/api/admission/v1"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	testDefaultOversellRatio = 10
	testDatabaseRatio        = 5
)

// Test helper functions

func createTestContext(username string) context.Context {
	ctx := context.Background()
	if username != "" {
		req := admission.Request{
			AdmissionRequest: admissionv1.AdmissionRequest{
				UserInfo: authenticationv1.UserInfo{
					Username: username,
				},
			},
		}
		ctx = admission.NewContextWithRequest(ctx, req)
	}
	return ctx
}

// Deployment Tests

func TestWorkloadMutator_MutateDeployment(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		deployment  *appsv1.Deployment
		username    string
		expectedCPU string
		expectedMem string
		shouldMutate bool
	}{
		{
			name: "deployment in user namespace with user service account",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-deploy",
					Namespace: "ns-test",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
							},
						},
					},
				},
			},
			username:     "system:serviceaccount:ns-test:default",
			expectedCPU:  "100m",
			expectedMem:  "102Mi",
			shouldMutate: true,
		},
		{
			name: "deployment with non-user service account - should not mutate",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "system-deploy",
					Namespace: "ns-test",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
							},
						},
					},
				},
			},
			username:     "system:serviceaccount:kube-system:default",
			expectedCPU:  "500m",
			expectedMem:  "512Mi",
			shouldMutate: false,
		},
		{
			name: "deployment in non-user namespace - should not mutate",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "system-deploy",
					Namespace: "kube-system",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
							},
						},
					},
				},
			},
			username:     "system:serviceaccount:ns-test:default",
			expectedCPU:  "500m",
			expectedMem:  "512Mi",
			shouldMutate: false,
		},
		{
			name: "database deployment - use database ratio",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "mysql-deploy",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "mysql",
									Resources: corev1.ResourceRequirements{
										Limits: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("1000m"),
											corev1.ResourceMemory: resource.MustParse("2Gi"),
										},
										Requests: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("500m"),
											corev1.ResourceMemory: resource.MustParse("1Gi"),
										},
									},
								},
								{
									Name: "sidecar",
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
				},
			},
			username:     "system:serviceaccount:ns-database:default",
			expectedCPU:  "200m",
			expectedMem:  "409Mi",
			shouldMutate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.Default(ctx, tt.deployment)
			if err != nil {
				t.Errorf("Default() error = %v", err)
				return
			}

			container := &tt.deployment.Spec.Template.Spec.Containers[0]
			actualCPU := container.Resources.Requests[corev1.ResourceCPU]
			actualMem := container.Resources.Requests[corev1.ResourceMemory]

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("CPU request = %s, want %s", actualCPU.String(), expectedCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("Memory request = %s, want %s", actualMem.String(), expectedMem.String())
			}

			// For database deployments, verify only first container is mutated
			if len(tt.deployment.Labels) > 0 && isDatabasePodFromLabels(tt.deployment.Labels) {
				if len(tt.deployment.Spec.Template.Spec.Containers) > 1 {
					secondContainer := &tt.deployment.Spec.Template.Spec.Containers[1]
					// Second container should not have any requests set (remains empty)
					if len(secondContainer.Resources.Requests) > 0 {
						t.Errorf("Second container in database deployment should not be mutated")
					}
				}
			}
		})
	}
}

// StatefulSet Tests

func TestWorkloadMutator_MutateStatefulSet(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		statefulset *appsv1.StatefulSet
		username    string
		expectedCPU string
		expectedMem string
	}{
		{
			name: "statefulset in user namespace",
			statefulset: &appsv1.StatefulSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-sts",
					Namespace: "ns-test",
				},
				Spec: appsv1.StatefulSetSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectedCPU: "200m",
			expectedMem: "409Mi",
		},
		{
			name: "database statefulset with init containers",
			statefulset: &appsv1.StatefulSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "postgres-sts",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "postgresql",
					},
				},
				Spec: appsv1.StatefulSetSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							InitContainers: []corev1.Container{
								{
									Name: "init-db",
									Resources: corev1.ResourceRequirements{
										Limits: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("500m"),
											corev1.ResourceMemory: resource.MustParse("512Mi"),
										},
										Requests: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("250m"),
											corev1.ResourceMemory: resource.MustParse("256Mi"),
										},
									},
								},
							},
							Containers: []corev1.Container{
								{
									Name: "postgres",
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
				},
			},
			username:    "system:serviceaccount:ns-database:default",
			expectedCPU: "400m",
			expectedMem: "819Mi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.Default(ctx, tt.statefulset)
			if err != nil {
				t.Errorf("Default() error = %v", err)
				return
			}

			container := &tt.statefulset.Spec.Template.Spec.Containers[0]
			actualCPU := container.Resources.Requests[corev1.ResourceCPU]
			actualMem := container.Resources.Requests[corev1.ResourceMemory]

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("CPU request = %s, want %s", actualCPU.String(), expectedCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("Memory request = %s, want %s", actualMem.String(), expectedMem.String())
			}

			// Verify init containers are not mutated for database workloads
			if len(tt.statefulset.Labels) > 0 && isDatabasePodFromLabels(tt.statefulset.Labels) {
				if len(tt.statefulset.Spec.Template.Spec.InitContainers) > 0 {
					initContainer := &tt.statefulset.Spec.Template.Spec.InitContainers[0]
					originalCPU := resource.MustParse("250m")
					actualInitCPU := initContainer.Resources.Requests[corev1.ResourceCPU]
					if !actualInitCPU.Equal(originalCPU) {
						t.Errorf("Database init container should not be mutated")
					}
				}
			}
		})
	}
}

// ReplicaSet Tests

func TestWorkloadMutator_MutateReplicaSet(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		replicaset  *appsv1.ReplicaSet
		username    string
		expectedCPU string
		expectedMem string
	}{
		{
			name: "replicaset in user namespace",
			replicaset: &appsv1.ReplicaSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-rs",
					Namespace: "ns-test",
				},
				Spec: appsv1.ReplicaSetSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
									Resources: corev1.ResourceRequirements{
										Limits: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("500m"),
											corev1.ResourceMemory: resource.MustParse("512Mi"),
										},
									},
								},
							},
						},
					},
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectedCPU: "50m",
			expectedMem: "51Mi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.Default(ctx, tt.replicaset)
			if err != nil {
				t.Errorf("Default() error = %v", err)
				return
			}

			container := &tt.replicaset.Spec.Template.Spec.Containers[0]
			actualCPU := container.Resources.Requests[corev1.ResourceCPU]
			actualMem := container.Resources.Requests[corev1.ResourceMemory]

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("CPU request = %s, want %s", actualCPU.String(), expectedCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("Memory request = %s, want %s", actualMem.String(), expectedMem.String())
			}
		})
	}
}

// Pod Tests

func TestWorkloadMutator_MutatePod(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		pod         *corev1.Pod
		username    string
		expectedCPU string
		expectedMem string
	}{
		{
			name: "pod in user namespace with user service account",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "test-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "app",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
						},
					},
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectedCPU: "100m",
			expectedMem: "102Mi",
		},
		{
			name: "database pod with multiple containers",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "mysql-pod",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "mysql",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
						},
						{
							Name: "sidecar",
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
			username:    "system:serviceaccount:ns-database:default",
			expectedCPU: "200m",
			expectedMem: "204Mi",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.Default(ctx, tt.pod)
			if err != nil {
				t.Errorf("Default() error = %v", err)
				return
			}

			container := &tt.pod.Spec.Containers[0]
			actualCPU := container.Resources.Requests[corev1.ResourceCPU]
			actualMem := container.Resources.Requests[corev1.ResourceMemory]

			expectedCPU := resource.MustParse(tt.expectedCPU)
			expectedMem := resource.MustParse(tt.expectedMem)

			if !actualCPU.Equal(expectedCPU) {
				t.Errorf("CPU request = %s, want %s", actualCPU.String(), expectedCPU.String())
			}

			if !actualMem.Equal(expectedMem) {
				t.Errorf("Memory request = %s, want %s", actualMem.String(), expectedMem.String())
			}
		})
	}
}

// Validation Tests

func TestWorkloadMutator_ValidateDeployment(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		deployment  *appsv1.Deployment
		username    string
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid deployment with user service account",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "valid-deploy",
					Namespace: "ns-test",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: false,
		},
		{
			name: "deployment with zero CPU but non-user service account - should skip validation",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "system-deploy",
					Namespace: "kube-system",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:kube-system:default",
			expectError: false, // Should skip validation for non-user service account
		},
		{
			name: "deployment with zero CPU in non-user namespace - should skip validation",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "app-deploy",
					Namespace: "default",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: false, // Should skip validation for non-user namespace
		},
		{
			name: "deployment with zero CPU limit",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-cpu-deploy",
					Namespace: "ns-test",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'app'",
		},
		{
			name: "deployment with zero memory limit",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-mem-deploy",
					Namespace: "ns-test",
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: true,
			errorMsg:    "memory limit cannot be set to '0' for container[0] 'app'",
		},
		{
			name: "database deployment with valid first container and invalid second container",
			deployment: &appsv1.Deployment{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-deploy",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: appsv1.DeploymentSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "mysql",
									Resources: corev1.ResourceRequirements{
										Limits: corev1.ResourceList{
											corev1.ResourceCPU:    resource.MustParse("1000m"),
											corev1.ResourceMemory: resource.MustParse("1Gi"),
										},
									},
								},
								{
									Name: "sidecar",
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
				},
			},
			username:    "system:serviceaccount:ns-database:default",
			expectError: false, // Database deployments only validate first container
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.ValidateCreate(ctx, tt.deployment)

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

func TestWorkloadMutator_ValidateStatefulSet(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		statefulset *appsv1.StatefulSet
		username    string
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid statefulset",
			statefulset: &appsv1.StatefulSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "valid-sts",
					Namespace: "ns-test",
				},
				Spec: appsv1.StatefulSetSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: false,
		},
		{
			name: "statefulset with zero CPU limit",
			statefulset: &appsv1.StatefulSet{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "zero-cpu-sts",
					Namespace: "ns-test",
				},
				Spec: appsv1.StatefulSetSpec{
					Template: corev1.PodTemplateSpec{
						Spec: corev1.PodSpec{
							Containers: []corev1.Container{
								{
									Name: "app",
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
				},
			},
			username:    "system:serviceaccount:ns-test:default",
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'app'",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.ValidateCreate(ctx, tt.statefulset)

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

func TestWorkloadMutator_ValidatePod(t *testing.T) {
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, "", "")

	tests := []struct {
		name        string
		pod         *corev1.Pod
		username    string
		expectError bool
		errorMsg    string
	}{
		{
			name: "valid pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "valid-pod",
					Namespace: "ns-test",
				},
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "app",
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
			username:    "system:serviceaccount:ns-test:default",
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
							Name: "app",
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
			username:    "system:serviceaccount:ns-test:default",
			expectError: true,
			errorMsg:    "CPU limit cannot be set to '0' for container[0] 'app'",
		},
		{
			name: "database pod with init containers - init containers should be skipped",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Name:      "db-pod-with-init",
					Namespace: "ns-database",
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "mysql",
					},
				},
				Spec: corev1.PodSpec{
					InitContainers: []corev1.Container{
						{
							Name: "init-db",
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
							Name: "mysql",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1000m"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
						},
					},
				},
			},
			username:    "system:serviceaccount:ns-database:default",
			expectError: false, // Init containers should be skipped for database pods
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := createTestContext(tt.username)
			err := mutator.ValidateCreate(ctx, tt.pod)

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

// Threshold Tests

func TestWorkloadMutator_WithThresholds(t *testing.T) {
	skipCPU := "100m"
	skipMem := "128Mi"
	mutator := NewWorkloadMutatorWithThresholds(testDefaultOversellRatio, testDatabaseRatio, skipCPU, skipMem)

	deployment := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "threshold-test-deploy",
			Namespace: "ns-test",
		},
		Spec: appsv1.DeploymentSpec{
			Template: corev1.PodTemplateSpec{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Name: "app",
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("50m"),
									corev1.ResourceMemory: resource.MustParse("64Mi"),
								},
								Requests: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("25m"),
									corev1.ResourceMemory: resource.MustParse("32Mi"),
								},
							},
						},
					},
				},
			},
		},
	}

	ctx := createTestContext("system:serviceaccount:ns-test:default")
	err := mutator.Default(ctx, deployment)
	if err != nil {
		t.Errorf("Default() error = %v", err)
		return
	}

	// Resources should not be mutated because they are below threshold
	container := &deployment.Spec.Template.Spec.Containers[0]
	actualCPU := container.Resources.Requests[corev1.ResourceCPU]
	actualMem := container.Resources.Requests[corev1.ResourceMemory]

	expectedCPU := resource.MustParse("25m")
	expectedMem := resource.MustParse("32Mi")

	if !actualCPU.Equal(expectedCPU) {
		t.Errorf("CPU should not be mutated due to threshold. Got %s, want %s", actualCPU.String(), expectedCPU.String())
	}

	if !actualMem.Equal(expectedMem) {
		t.Errorf("Memory should not be mutated due to threshold. Got %s, want %s", actualMem.String(), expectedMem.String())
	}
}

// Helper function tests

func TestIsDatabasePodFromLabels(t *testing.T) {
	tests := []struct {
		name     string
		labels   map[string]string
		expected bool
	}{
		{
			name: "valid database labels",
			labels: map[string]string{
				KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
				KubeBlocksComponentLabel: "mysql",
			},
			expected: true,
		},
		{
			name: "missing component label",
			labels: map[string]string{
				KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
			},
			expected: false,
		},
		{
			name: "wrong managed-by value",
			labels: map[string]string{
				KubeBlocksManagedByLabel: "helm",
				KubeBlocksComponentLabel: "mysql",
			},
			expected: false,
		},
		{
			name:     "nil labels",
			labels:   nil,
			expected: false,
		},
		{
			name:     "empty labels",
			labels:   map[string]string{},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isDatabasePodFromLabels(tt.labels)
			if result != tt.expected {
				t.Errorf("isDatabasePodFromLabels() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestIsDatabasePod(t *testing.T) {
	tests := []struct {
		name     string
		pod      *corev1.Pod
		expected bool
	}{
		{
			name: "valid database pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						KubeBlocksManagedByLabel: KubeBlocksManagedByValue,
						KubeBlocksComponentLabel: "postgresql",
					},
				},
			},
			expected: true,
		},
		{
			name: "regular pod",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{
					Labels: map[string]string{
						"app": "myapp",
					},
				},
			},
			expected: false,
		},
		{
			name: "pod with nil labels",
			pod: &corev1.Pod{
				ObjectMeta: metav1.ObjectMeta{},
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := isDatabasePod(tt.pod)
			if result != tt.expected {
				t.Errorf("isDatabasePod() = %v, want %v", result, tt.expected)
			}
		})
	}
}
