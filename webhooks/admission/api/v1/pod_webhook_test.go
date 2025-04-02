package v1

import (
	"testing"

	corev1 "k8s.io/api/core/v1"
	resource "k8s.io/apimachinery/pkg/api/resource"
)

func TestPodMutator_Mutate(t *testing.T) {
	tests := []struct {
		name           string
		mutator        *PodMutator
		inputPod       *corev1.Pod
		expectedCPU    string
		expectedMemory string
	}{
		{
			name: "basic test with default ratio",
			mutator: &PodMutator{
				MinRequestCPU: resource.MustParse("100m"),
				MinRequestMem: resource.MustParse("100Mi"),
				RequestRatio:  2.0,
			},
			inputPod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:    "500m",  // 1000m / 2
			expectedMemory: "512Mi", // 1Gi / 2
		},
		{
			name: "test with minimum values",
			mutator: &PodMutator{
				MinRequestCPU: resource.MustParse("200m"),
				MinRequestMem: resource.MustParse("200Mi"),
				RequestRatio:  2.0,
			},
			inputPod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("300m"),
									corev1.ResourceMemory: resource.MustParse("300Mi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:    "200m",  // min value (150m would be too low)
			expectedMemory: "200Mi", // min value (150Mi would be too low)
		},
		{
			name: "test with zero limits",
			mutator: &PodMutator{
				MinRequestCPU: resource.MustParse("100m"),
				MinRequestMem: resource.MustParse("100Mi"),
				RequestRatio:  2.0,
			},
			inputPod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{},
							},
						},
					},
				},
			},
			expectedCPU:    "0",
			expectedMemory: "0",
		},
		{
			name: "test with custom ratio",
			mutator: &PodMutator{
				MinRequestCPU: resource.MustParse("100m"),
				MinRequestMem: resource.MustParse("100Mi"),
				RequestRatio:  4.0,
			},
			inputPod: &corev1.Pod{
				Spec: corev1.PodSpec{
					Containers: []corev1.Container{
						{
							Resources: corev1.ResourceRequirements{
								Limits: corev1.ResourceList{
									corev1.ResourceCPU:    resource.MustParse("1"),
									corev1.ResourceMemory: resource.MustParse("1Gi"),
								},
							},
						},
					},
				},
			},
			expectedCPU:    "250m",  // 1000m / 4
			expectedMemory: "256Mi", // 1Gi / 4
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Initialize empty resource lists if nil
			for i := range tt.inputPod.Spec.Containers {
				if tt.inputPod.Spec.Containers[i].Resources.Requests == nil {
					tt.inputPod.Spec.Containers[i].Resources.Requests = make(corev1.ResourceList)
				}
				if tt.inputPod.Spec.Containers[i].Resources.Limits == nil {
					tt.inputPod.Spec.Containers[i].Resources.Limits = make(corev1.ResourceList)
				}
			}

			err := tt.mutator.mutate(tt.inputPod)
			if err != nil {
				t.Errorf("unexpected error: %v", err)
				return
			}

			container := tt.inputPod.Spec.Containers[0]

			// Check CPU
			if tt.expectedCPU != "0" {
				expectedCPU := resource.MustParse(tt.expectedCPU)
				if !container.Resources.Requests.Cpu().Equal(expectedCPU) {
					t.Errorf("CPU request mismatch: got %v, want %v", container.Resources.Requests.Cpu(), expectedCPU)
				}
			} else if container.Resources.Requests.Cpu().Value() != 0 {
				t.Errorf("expected zero CPU request, got %v", container.Resources.Requests.Cpu())
			}

			// Check Memory
			if tt.expectedMemory != "0" {
				expectedMemory := resource.MustParse(tt.expectedMemory)
				if !container.Resources.Requests.Memory().Equal(expectedMemory) {
					t.Errorf("Memory request mismatch: got %v, want %v", container.Resources.Requests.Memory(), expectedMemory)
				}
			} else if container.Resources.Requests.Memory().Value() != 0 {
				t.Errorf("expected zero Memory request, got %v", container.Resources.Requests.Memory())
			}
		})
	}
}
