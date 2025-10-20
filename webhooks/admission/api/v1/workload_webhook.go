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

	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	"k8s.io/apimachinery/pkg/runtime"
	ctrl "sigs.k8s.io/controller-runtime"
	"sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

const (
	// Labels to identify KubeBlocks database pods
	KubeBlocksManagedByLabel = "app.kubernetes.io/managed-by"
	KubeBlocksManagedByValue = "kubeblocks"
	KubeBlocksComponentLabel = "apps.kubeblocks.io/component-name"
)

// WorkloadMutator mutates workload resources (Deployment, StatefulSet, ReplicaSet, Pod)
type WorkloadMutator struct {
	// DefaultOversellRatio is the oversell ratio for normal pods
	DefaultOversellRatio int
	// DatabaseOversellRatio is the oversell ratio for database pods
	DatabaseOversellRatio int
	// SkipCPUThreshold is the CPU limit threshold below which to skip request validation
	SkipCPUThreshold *resource.Quantity
	// SkipMemoryThreshold is the memory limit threshold below which to skip request validation
	SkipMemoryThreshold *resource.Quantity
}

// NewWorkloadMutatorWithThresholds creates a new WorkloadMutator with custom oversell ratios and skip thresholds
func NewWorkloadMutatorWithThresholds(
	defaultRatio, databaseRatio int,
	skipCPUThreshold, skipMemoryThreshold string,
) *WorkloadMutator {
	var cpuThreshold, memoryThreshold *resource.Quantity

	if skipCPUThreshold != "" {
		if threshold, err := resource.ParseQuantity(skipCPUThreshold); err == nil {
			cpuThreshold = &threshold
		}
	}

	if skipMemoryThreshold != "" {
		if threshold, err := resource.ParseQuantity(skipMemoryThreshold); err == nil {
			memoryThreshold = &threshold
		}
	}

	return &WorkloadMutator{
		DefaultOversellRatio:  defaultRatio,
		DatabaseOversellRatio: databaseRatio,
		SkipCPUThreshold:      cpuThreshold,
		SkipMemoryThreshold:   memoryThreshold,
	}
}

// Default implements webhook.Defaulter interface
func (r *WorkloadMutator) Default(ctx context.Context, obj runtime.Object) error {
	request, _ := admission.RequestFromContext(ctx)

	// Only process resources created by user service accounts
	if !isUserServiceAccount(request.UserInfo.Username) {
		ctrl.Log.WithName("workload-mutator").
			Info("Skipping mutation - not a user service account",
				"username", request.UserInfo.Username)
		return nil
	}

	// Get namespace from the object
	namespace := getNamespace(obj)

	// Only apply oversell to namespaces starting with "ns-"
	if !isUserNamespace(namespace) {
		ctrl.Log.WithName("workload-mutator").
			Info("Skipping oversell mutation - namespace doesn't match pattern",
				"namespace", namespace)
		return nil
	}

	switch o := obj.(type) {
	case *appsv1.Deployment:
		return r.mutateDeployment(ctx, o)
	case *appsv1.StatefulSet:
		return r.mutateStatefulSet(ctx, o)
	case *appsv1.ReplicaSet:
		return r.mutateReplicaSet(ctx, o)
	case *corev1.Pod:
		return r.mutatePod(ctx, o)
	default:
		return fmt.Errorf("expected a Deployment, StatefulSet, ReplicaSet or Pod but got a %T", obj)
	}
}

// ValidateCreate implements webhook.Validator interface
func (r *WorkloadMutator) ValidateCreate(ctx context.Context, obj runtime.Object) error {
	request, _ := admission.RequestFromContext(ctx)

	// Only process resources created by user service accounts
	if !isUserServiceAccount(request.UserInfo.Username) {
		ctrl.Log.WithName("workload-validator").
			Info("Skipping validation - not a user service account",
				"username", request.UserInfo.Username)
		return nil
	}

	// Get namespace from the object
	namespace := getNamespace(obj)

	// Only validate resources in user namespaces starting with "ns-"
	if !isUserNamespace(namespace) {
		ctrl.Log.WithName("workload-validator").
			Info("Skipping validation - namespace doesn't match pattern",
				"namespace", namespace)
		return nil
	}

	switch o := obj.(type) {
	case *appsv1.Deployment:
		return r.validateDeployment(ctx, o)
	case *appsv1.StatefulSet:
		return r.validateStatefulSet(ctx, o)
	case *appsv1.ReplicaSet:
		return r.validateReplicaSet(ctx, o)
	case *corev1.Pod:
		return r.validatePod(ctx, o)
	default:
		return fmt.Errorf("expected a Deployment, StatefulSet, ReplicaSet or Pod but got a %T", obj)
	}
}

// ValidateUpdate implements webhook.Validator interface
func (r *WorkloadMutator) ValidateUpdate(ctx context.Context, oldObj, newObj runtime.Object) error {
	request, _ := admission.RequestFromContext(ctx)

	// Only process resources created by user service accounts
	if !isUserServiceAccount(request.UserInfo.Username) {
		ctrl.Log.WithName("workload-validator").
			Info("Skipping validation - not a user service account",
				"username", request.UserInfo.Username)
		return nil
	}

	// Get namespace from the object
	namespace := getNamespace(newObj)

	// Only validate resources in user namespaces starting with "ns-"
	if !isUserNamespace(namespace) {
		ctrl.Log.WithName("workload-validator").
			Info("Skipping validation - namespace doesn't match pattern",
				"namespace", namespace)
		return nil
	}

	switch o := newObj.(type) {
	case *appsv1.Deployment:
		return r.validateDeployment(ctx, o)
	case *appsv1.StatefulSet:
		return r.validateStatefulSet(ctx, o)
	case *appsv1.ReplicaSet:
		return r.validateReplicaSet(ctx, o)
	case *corev1.Pod:
		return r.validatePod(ctx, o)
	default:
		return fmt.Errorf("expected a Deployment, StatefulSet, ReplicaSet or Pod but got a %T", newObj)
	}
}

// ValidateDelete implements webhook.Validator interface
func (r *WorkloadMutator) ValidateDelete(ctx context.Context, obj runtime.Object) error {
	// No validation needed for delete operations
	return nil
}

func (r *WorkloadMutator) mutateDeployment(
	_ context.Context,
	deployment *appsv1.Deployment,
) error {
	ctrl.Log.WithName("workload-mutator").
		Info("Mutating deployment", "name", deployment.Name, "namespace", deployment.Namespace)

	r.mutatePodSpec(&deployment.Spec.Template.Spec, deployment.Labels)
	return nil
}

func (r *WorkloadMutator) mutateStatefulSet(
	_ context.Context,
	statefulSet *appsv1.StatefulSet,
) error {
	ctrl.Log.WithName("workload-mutator").
		Info("Mutating statefulset", "name", statefulSet.Name, "namespace", statefulSet.Namespace)

	r.mutatePodSpec(&statefulSet.Spec.Template.Spec, statefulSet.Labels)
	return nil
}

func (r *WorkloadMutator) mutateReplicaSet(
	_ context.Context,
	replicaSet *appsv1.ReplicaSet,
) error {
	ctrl.Log.WithName("workload-mutator").
		Info("Mutating replicaset", "name", replicaSet.Name, "namespace", replicaSet.Namespace)

	r.mutatePodSpec(&replicaSet.Spec.Template.Spec, replicaSet.Labels)
	return nil
}

func (r *WorkloadMutator) mutatePod(_ context.Context, pod *corev1.Pod) error {
	ctrl.Log.WithName("workload-mutator").
		Info("Mutating pod", "name", pod.Name, "namespace", pod.Namespace)

	r.mutatePodSpec(&pod.Spec, pod.Labels)
	return nil
}

func (r *WorkloadMutator) validateDeployment(
	_ context.Context,
	deployment *appsv1.Deployment,
) error {
	ctrl.Log.WithName("workload-validator").Info("Validating deployment",
		"name", deployment.Name,
		"namespace", deployment.Namespace)

	isDatabaseWorkload := isDatabasePodFromLabels(deployment.Labels)

	// For database workloads, only validate the first container
	if isDatabaseWorkload && len(deployment.Spec.Template.Spec.Containers) > 0 {
		if err := r.validateContainerResources(&deployment.Spec.Template.Spec.Containers[0], "container[0]"); err != nil {
			return err
		}
	} else {
		// For non-database workloads, validate all containers
		for i, container := range deployment.Spec.Template.Spec.Containers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
				return err
			}
		}
	}

	// Validate init containers (skip for database workloads)
	if !isDatabaseWorkload {
		for i, container := range deployment.Spec.Template.Spec.InitContainers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("initContainer[%d]", i)); err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *WorkloadMutator) validateStatefulSet(
	_ context.Context,
	statefulSet *appsv1.StatefulSet,
) error {
	ctrl.Log.WithName("workload-validator").Info("Validating statefulset",
		"name", statefulSet.Name,
		"namespace", statefulSet.Namespace)

	isDatabaseWorkload := isDatabasePodFromLabels(statefulSet.Labels)

	// For database workloads, only validate the first container
	if isDatabaseWorkload && len(statefulSet.Spec.Template.Spec.Containers) > 0 {
		if err := r.validateContainerResources(&statefulSet.Spec.Template.Spec.Containers[0], "container[0]"); err != nil {
			return err
		}
	} else {
		// For non-database workloads, validate all containers
		for i, container := range statefulSet.Spec.Template.Spec.Containers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
				return err
			}
		}
	}

	// Validate init containers (skip for database workloads)
	if !isDatabaseWorkload {
		for i, container := range statefulSet.Spec.Template.Spec.InitContainers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("initContainer[%d]", i)); err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *WorkloadMutator) validateReplicaSet(
	_ context.Context,
	replicaSet *appsv1.ReplicaSet,
) error {
	ctrl.Log.WithName("workload-validator").Info("Validating replicaset",
		"name", replicaSet.Name,
		"namespace", replicaSet.Namespace)

	isDatabaseWorkload := isDatabasePodFromLabels(replicaSet.Labels)

	// For database workloads, only validate the first container
	if isDatabaseWorkload && len(replicaSet.Spec.Template.Spec.Containers) > 0 {
		if err := r.validateContainerResources(&replicaSet.Spec.Template.Spec.Containers[0], "container[0]"); err != nil {
			return err
		}
	} else {
		// For non-database workloads, validate all containers
		for i, container := range replicaSet.Spec.Template.Spec.Containers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
				return err
			}
		}
	}

	// Validate init containers (skip for database workloads)
	if !isDatabaseWorkload {
		for i, container := range replicaSet.Spec.Template.Spec.InitContainers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("initContainer[%d]", i)); err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *WorkloadMutator) validatePod(ctx context.Context, pod *corev1.Pod) error {
	request, _ := admission.RequestFromContext(ctx)

	ctrl.Log.WithName("workload-validator").Info("Validating pod",
		"name", pod.Name,
		"namespace", pod.Namespace,
		"user", request.UserInfo.Username)

	isDatabasePod := isDatabasePod(pod)

	// For database pods, only validate the first container
	if isDatabasePod && len(pod.Spec.Containers) > 0 {
		if err := r.validateContainerResources(&pod.Spec.Containers[0], "container[0]"); err != nil {
			return err
		}
	} else {
		// For non-database pods, validate all containers
		for i, container := range pod.Spec.Containers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("container[%d]", i)); err != nil {
				return err
			}
		}
	}

	// Validate init containers (skip for database pods)
	if !isDatabasePod {
		for i, container := range pod.Spec.InitContainers {
			if err := r.validateContainerResources(&container, fmt.Sprintf("initContainer[%d]", i)); err != nil {
				return err
			}
		}
	}

	return nil
}

// validateContainerResources validates that CPU and memory limits are not set to "0"
func (r *WorkloadMutator) validateContainerResources(
	container *corev1.Container,
	containerName string,
) error {
	if container.Resources.Limits == nil {
		return nil // No limits to validate
	}

	// Check CPU limit
	if cpuLimit, exists := container.Resources.Limits[corev1.ResourceCPU]; exists {
		if cpuLimit.IsZero() {
			return fmt.Errorf(
				"CPU limit cannot be set to '0' for %s '%s'",
				containerName,
				container.Name,
			)
		}
	}

	// Check Memory limit
	if memLimit, exists := container.Resources.Limits[corev1.ResourceMemory]; exists {
		if memLimit.IsZero() {
			return fmt.Errorf(
				"memory limit cannot be set to '0' for %s '%s'",
				containerName,
				container.Name,
			)
		}
	}

	return nil
}

func (r *WorkloadMutator) mutatePodSpec(podSpec *corev1.PodSpec, labels map[string]string) {
	// Determine oversell ratio based on labels
	oversellRatio := r.getOversellRatioFromLabels(labels)
	isDatabasePod := isDatabasePodFromLabels(labels)

	// For database pods, only process the first container
	if isDatabasePod && len(podSpec.Containers) > 0 {
		r.mutateContainerResources(&podSpec.Containers[0], oversellRatio)
	} else {
		// For non-database pods, mutate all containers
		for i := range podSpec.Containers {
			r.mutateContainerResources(&podSpec.Containers[i], oversellRatio)
		}
	}

	// Mutate init containers if any (skip for database pods)
	if !isDatabasePod {
		for i := range podSpec.InitContainers {
			r.mutateContainerResources(&podSpec.InitContainers[i], oversellRatio)
		}
	}
}

// isDatabasePodFromLabels checks if the workload is a KubeBlocks database workload
func isDatabasePodFromLabels(labels map[string]string) bool {
	if labels == nil {
		return false
	}

	managedBy, hasManagedBy := labels[KubeBlocksManagedByLabel]
	_, hasComponent := labels[KubeBlocksComponentLabel]

	return hasManagedBy && managedBy == KubeBlocksManagedByValue && hasComponent
}

// isDatabasePod checks if the pod is a KubeBlocks database pod
func isDatabasePod(pod *corev1.Pod) bool {
	return isDatabasePodFromLabels(pod.Labels)
}

// getOversellRatioFromLabels determines the oversell ratio based on labels
func (r *WorkloadMutator) getOversellRatioFromLabels(labels map[string]string) int {
	if isDatabasePodFromLabels(labels) {
		return r.DatabaseOversellRatio
	}
	return r.DefaultOversellRatio
}

// mutateContainerResources adjusts container resource requests based on oversell ratio
func (r *WorkloadMutator) mutateContainerResources(container *corev1.Container, oversellRatio int) {
	if container.Resources.Requests == nil {
		container.Resources.Requests = make(corev1.ResourceList)
	}

	if container.Resources.Limits == nil {
		return // No limits means no mutation needed
	}

	// Adjust CPU and memory requests
	r.mutateCPURequest(container, oversellRatio)
	r.mutateMemoryRequest(container, oversellRatio)
}

// mutateCPURequest adjusts container CPU resource requests based on oversell ratio
func (r *WorkloadMutator) mutateCPURequest(container *corev1.Container, oversellRatio int) {
	cpuLimit, exists := container.Resources.Limits[corev1.ResourceCPU]
	if !exists || cpuLimit.IsZero() {
		return
	}

	// Skip CPU mutation if limit is below threshold
	if r.SkipCPUThreshold != nil && cpuLimit.Cmp(*r.SkipCPUThreshold) < 0 {
		ctrl.Log.WithName("workload-mutator").
			Info("Skipping CPU request mutation - limit below threshold",
				"container", container.Name,
				"limit", cpuLimit.String(),
				"threshold", r.SkipCPUThreshold.String())
		return
	}

	maxCPURequest := r.calculateMaxCPURequest(cpuLimit, oversellRatio)
	currentCPURequest := container.Resources.Requests[corev1.ResourceCPU]

	// Only adjust if current request exceeds the maximum allowed or is not set
	if currentCPURequest.IsZero() || currentCPURequest.Cmp(maxCPURequest) > 0 {
		container.Resources.Requests[corev1.ResourceCPU] = maxCPURequest

		ctrl.Log.WithName("workload-mutator").Info("Adjusted CPU request",
			"container", container.Name,
			"originalRequest", currentCPURequest.String(),
			"limit", cpuLimit.String(),
			"newRequest", maxCPURequest.String(),
			"oversellRatio", oversellRatio)
	}
}

// mutateMemoryRequest adjusts container memory resource requests based on oversell ratio
func (r *WorkloadMutator) mutateMemoryRequest(container *corev1.Container, oversellRatio int) {
	memLimit, exists := container.Resources.Limits[corev1.ResourceMemory]
	if !exists || memLimit.IsZero() {
		return
	}

	// Skip memory mutation if limit is below threshold
	if r.SkipMemoryThreshold != nil && memLimit.Cmp(*r.SkipMemoryThreshold) < 0 {
		ctrl.Log.WithName("workload-mutator").
			Info("Skipping memory request mutation - limit below threshold",
				"container", container.Name,
				"limit", memLimit.String(),
				"threshold", r.SkipMemoryThreshold.String())
		return
	}

	maxMemRequest := r.calculateMaxMemoryRequest(memLimit, oversellRatio)
	currentMemRequest := container.Resources.Requests[corev1.ResourceMemory]

	// Only adjust if current request exceeds the maximum allowed or is not set
	if currentMemRequest.IsZero() || currentMemRequest.Cmp(maxMemRequest) > 0 {
		container.Resources.Requests[corev1.ResourceMemory] = maxMemRequest

		ctrl.Log.WithName("workload-mutator").Info("Adjusted Memory request",
			"container", container.Name,
			"originalRequest", currentMemRequest.String(),
			"limit", memLimit.String(),
			"newRequest", maxMemRequest.String(),
			"oversellRatio", oversellRatio)
	}
}

// calculateMaxCPURequest calculates the maximum allowed CPU request based on limit and oversell ratio
func (r *WorkloadMutator) calculateMaxCPURequest(
	limit resource.Quantity,
	oversellRatio int,
) resource.Quantity {
	// Convert limit to millicores for calculation
	limitValue := limit.MilliValue()
	maxRequestValue := limitValue / int64(oversellRatio)

	// Create new quantity with calculated value in millicores (appropriate for CPU)
	maxRequest := resource.NewMilliQuantity(maxRequestValue, resource.DecimalSI)
	return *maxRequest
}

// calculateMaxMemoryRequest calculates the maximum allowed memory request based on limit and oversell ratio
func (r *WorkloadMutator) calculateMaxMemoryRequest(
	limit resource.Quantity,
	oversellRatio int,
) resource.Quantity {
	// Convert limit to bytes for calculation
	limitValue := limit.Value()
	maxRequestValue := limitValue / int64(oversellRatio)

	// Convert to human-readable format
	if maxRequestValue >= 1024*1024*1024 { // >= 1Gi
		giValue := maxRequestValue / (1024 * 1024 * 1024)
		remainder := maxRequestValue % (1024 * 1024 * 1024)
		if remainder == 0 {
			return resource.MustParse(fmt.Sprintf("%dGi", giValue))
		}
		// If there's remainder, fall through to Mi calculation
	}

	if maxRequestValue >= 1024*1024 { // >= 1Mi
		miValue := maxRequestValue / (1024 * 1024)
		remainder := maxRequestValue % (1024 * 1024)
		if remainder == 0 {
			return resource.MustParse(fmt.Sprintf("%dMi", miValue))
		}
		// If there's remainder but > 1Mi, use fractional Mi
		if miValue > 0 {
			return resource.MustParse(fmt.Sprintf("%dMi", miValue))
		}
	}

	if maxRequestValue >= 1024 { // >= 1Ki
		kiValue := maxRequestValue / 1024
		remainder := maxRequestValue % 1024
		if remainder == 0 {
			return resource.MustParse(fmt.Sprintf("%dKi", kiValue))
		}
		// If there's remainder but > 1Ki, use fractional Ki
		if kiValue > 0 {
			return resource.MustParse(fmt.Sprintf("%dKi", kiValue))
		}
	}

	// Less than 1Ki, use bytes
	return resource.MustParse(fmt.Sprintf("%d", maxRequestValue))
}

// getNamespace extracts namespace from runtime.Object
func getNamespace(obj runtime.Object) string {
	switch o := obj.(type) {
	case *appsv1.Deployment:
		return o.Namespace
	case *appsv1.StatefulSet:
		return o.Namespace
	case *appsv1.ReplicaSet:
		return o.Namespace
	case *corev1.Pod:
		return o.Namespace
	default:
		return ""
	}
}

//+kubebuilder:webhook:path=/mutate-apps-v1-deployment,mutating=true,failurePolicy=ignore,sideEffects=None,groups=apps,resources=deployments,verbs=create;update,versions=v1,name=mdeployment.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/mutate-apps-v1-statefulset,mutating=true,failurePolicy=ignore,sideEffects=None,groups=apps,resources=statefulsets,verbs=create;update,versions=v1,name=mstatefulset.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/mutate-apps-v1-replicaset,mutating=true,failurePolicy=ignore,sideEffects=None,groups=apps,resources=replicasets,verbs=create;update,versions=v1,name=mreplicaset.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/mutate--v1-pod,mutating=true,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=mpod.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/validate-apps-v1-deployment,mutating=false,failurePolicy=ignore,sideEffects=None,groups=apps,resources=deployments,verbs=create;update,versions=v1,name=vdeployment.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/validate-apps-v1-statefulset,mutating=false,failurePolicy=ignore,sideEffects=None,groups=apps,resources=statefulsets,verbs=create;update,versions=v1,name=vstatefulset.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/validate-apps-v1-replicaset,mutating=false,failurePolicy=ignore,sideEffects=None,groups=apps,resources=replicasets,verbs=create;update,versions=v1,name=vreplicaset.sealos.io,admissionReviewVersions=v1

//+kubebuilder:webhook:path=/validate--v1-pod,mutating=false,failurePolicy=ignore,sideEffects=None,groups=core,resources=pods,verbs=create;update,versions=v1,name=vpod.sealos.io,admissionReviewVersions=v1
