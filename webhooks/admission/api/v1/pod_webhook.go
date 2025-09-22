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
	"fmt"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
)

const (
	// Default oversell ratios
	DefaultOversellRatio  = 10 // 10x oversell for normal pods
	DatabaseOversellRatio = 5  // 5x oversell for database pods

	// Labels to identify pod types
	DatabasePodLabel = "app.sealos.io/type"
	DatabasePodValue = "database"
)

// PodMutator mutates pods to adjust resource requests based on oversell ratios
type PodMutator struct{}

// Default implements webhook.Defaulter interface
func (r *PodMutator) Default(ctx context.Context, obj runtime.Object) error {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return fmt.Errorf("expected a Pod but got a %T", obj)
	}

	// Only apply oversell to namespaces starting with "ns-"
	if !isUserNamespace(pod.Namespace) {
		ctrl.Log.WithName("pod-mutator").Info("Skipping oversell mutation - namespace doesn't match pattern",
			"namespace", pod.Namespace)
		return nil
	}

	ctrl.Log.WithName("pod-mutator").Info("Mutating pod", "name", pod.Name, "namespace", pod.Namespace)

	// Determine oversell ratio based on pod labels
	oversellRatio := r.getOversellRatio(pod)

	// Mutate each container's resource requests
	for i := range pod.Spec.Containers {
		r.mutateContainerResources(&pod.Spec.Containers[i], oversellRatio)
	}

	// Mutate init containers if any
	for i := range pod.Spec.InitContainers {
		r.mutateContainerResources(&pod.Spec.InitContainers[i], oversellRatio)
	}

	return nil
}

// getOversellRatio determines the oversell ratio based on pod labels
func (r *PodMutator) getOversellRatio(pod *corev1.Pod) int {
	if pod.Labels != nil {
		if podType, exists := pod.Labels[DatabasePodLabel]; exists && podType == DatabasePodValue {
			return DatabaseOversellRatio
		}
	}
	return DefaultOversellRatio
}

// mutateContainerResources adjusts container resource requests based on oversell ratio
func (r *PodMutator) mutateContainerResources(container *corev1.Container, oversellRatio int) {
	if container.Resources.Requests == nil {
		container.Resources.Requests = make(corev1.ResourceList)
	}

	if container.Resources.Limits == nil {
		return // No limits means no mutation needed
	}

	// Adjust CPU requests
	if cpuLimit, exists := container.Resources.Limits[corev1.ResourceCPU]; exists {
		maxCPURequest := r.calculateMaxRequest(cpuLimit, oversellRatio)
		currentCPURequest := container.Resources.Requests[corev1.ResourceCPU]

		// Always set the request to the maximum allowed (oversell ratio)
		// This ensures all pods conform to the oversell ratio
		container.Resources.Requests[corev1.ResourceCPU] = maxCPURequest

		if !currentCPURequest.Equal(maxCPURequest) {
			ctrl.Log.WithName("pod-mutator").Info("Adjusted CPU request",
				"container", container.Name,
				"originalRequest", currentCPURequest.String(),
				"limit", cpuLimit.String(),
				"newRequest", maxCPURequest.String(),
				"oversellRatio", oversellRatio)
		}
	}

	// Adjust Memory requests
	if memLimit, exists := container.Resources.Limits[corev1.ResourceMemory]; exists {
		maxMemRequest := r.calculateMaxRequest(memLimit, oversellRatio)
		currentMemRequest := container.Resources.Requests[corev1.ResourceMemory]

		// Always set the request to the maximum allowed (oversell ratio)
		// This ensures all pods conform to the oversell ratio
		container.Resources.Requests[corev1.ResourceMemory] = maxMemRequest

		if !currentMemRequest.Equal(maxMemRequest) {
			ctrl.Log.WithName("pod-mutator").Info("Adjusted Memory request",
				"container", container.Name,
				"originalRequest", currentMemRequest.String(),
				"limit", memLimit.String(),
				"newRequest", maxMemRequest.String(),
				"oversellRatio", oversellRatio)
		}
	}
}

// calculateMaxRequest calculates the maximum allowed request based on limit and oversell ratio
func (r *PodMutator) calculateMaxRequest(limit resource.Quantity, oversellRatio int) resource.Quantity {
	// Convert limit to millicores/bytes for calculation
	limitValue := limit.MilliValue()
	maxRequestValue := limitValue / int64(oversellRatio)

	// Create new quantity with calculated value
	maxRequest := resource.NewMilliQuantity(maxRequestValue, limit.Format)
	return *maxRequest
}

// SetupWithManager sets up the webhook with the Manager
func (r *PodMutator) SetupWithManager(mgr ctrl.Manager) error {
	return ctrl.NewWebhookManagedBy(mgr).
		For(&corev1.Pod{}).
		WithDefaulter(r).
		Complete()
}
