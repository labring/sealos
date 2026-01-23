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
	"log/slog"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

type PodMatcher interface {
	Match(expectPod *corev1.Pod, pod *corev1.Pod) bool
}

type ResourceMatcher struct{}

func (r ResourceMatcher) Match(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	if container.Resources.Requests.Cpu().Cmp(*expectContainer.Resources.Requests.Cpu()) != 0 {
		slog.Info("CPU requests are not equal")
		return false
	}
	if container.Resources.Limits.Cpu().Cmp(*expectContainer.Resources.Limits.Cpu()) != 0 {
		slog.Info("CPU limits are not equal")
		return false
	}
	if container.Resources.Requests.Memory().Cmp(*expectContainer.Resources.Requests.Memory()) != 0 {
		slog.Info("Memory requests are not equal")
		return false
	}
	if container.Resources.Limits.Memory().Cmp(*expectContainer.Resources.Limits.Memory()) != 0 {
		slog.Info("Memory limits are not equal")
		return false
	}
	return true
}

type GPUResourceMatcher struct{}

const gpuResourceName corev1.ResourceName = "nvidia.com/gpu"
const gpuTypeAnnotation string = "nvidia.com/use-gputype"

func (g GPUResourceMatcher) Match(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	if len(expectPod.Spec.Containers) == 0 {
		slog.Info("Expect pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	if container.Resources.Limits.Name(gpuResourceName, resource.DecimalSI).Cmp(
		*expectContainer.Resources.Limits.Name(gpuResourceName, resource.DecimalSI),
	) != 0 {
		slog.Info("GPU limits are not equal")
		return false
	}
	if container.Resources.Requests.Name(gpuResourceName, resource.DecimalSI).Cmp(
		*expectContainer.Resources.Requests.Name(gpuResourceName, resource.DecimalSI),
	) != 0 {
		slog.Info("GPU requests are not equal")
		return false
	}

	expectGPUType, expectOK := expectPod.Annotations[gpuTypeAnnotation]
	actualGPUType, actualOK := pod.Annotations[gpuTypeAnnotation]
	if expectOK != actualOK || expectGPUType != actualGPUType {
		slog.Info("GPU type annotation is not equal")
		return false
	}
	return true
}

type EphemeralStorageMatcher struct{}

func (e EphemeralStorageMatcher) Match(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	if container.Resources.Limits.StorageEphemeral().Cmp(*expectContainer.Resources.Limits.StorageEphemeral()) != 0 {
		slog.Info("Ephemeral-Storage limits are not equal")
		return false
	}
	if container.Resources.Requests.StorageEphemeral().Cmp(*expectContainer.Resources.Requests.StorageEphemeral()) != 0 {
		slog.Info("Ephemeral-Storage requests are not equal")
		return false
	}
	return true
}

type EnvVarMatcher struct{}

func (e EnvVarMatcher) Match(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	// Match based on "expect": the actual container env can contain extra variables.
	for _, expectEnv := range expectContainer.Env {
		found := false
		for _, env := range container.Env {
			// SEALOS_COMMIT_IMAGE_NAME value may vary; only require existence.
			if expectEnv.Name == "SEALOS_COMMIT_IMAGE_NAME" {
				if env.Name == expectEnv.Name {
					found = true
					break
				}
				continue
			}
			if env.Name == expectEnv.Name && env.Value == expectEnv.Value {
				found = true
				break
			}
		}
		if !found {
			slog.Info("Environment variables are not equal", "env not found", expectEnv.Name, "env value", expectEnv.Value)
			return false
		}
	}
	return true
}

type PortMatcher struct{}

func (p PortMatcher) Match(expectPod *corev1.Pod, pod *corev1.Pod) bool {
	if len(pod.Spec.Containers) == 0 {
		slog.Info("Pod has no containers")
		return false
	}
	container := pod.Spec.Containers[0]
	expectContainer := expectPod.Spec.Containers[0]

	if len(container.Ports) != len(expectContainer.Ports) {
		slog.Info("Port count mismatch")
		return false
	}

	for _, expectPort := range expectContainer.Ports {
		found := false
		for _, podPort := range container.Ports {
			if expectPort.ContainerPort == podPort.ContainerPort && expectPort.Protocol == podPort.Protocol {
				found = true
				break
			}
		}
		if !found {
			slog.Info("Ports are not equal")
			return false
		}
	}
	return true
}

// PredicateCommitStatus returns the commit status of the pod
// if the pod container id is empty, it means the pod is pending or has't started, we can assume the image has not been committed
// otherwise, it means the pod has been started, we can assume the image has been committed

func PodMatchExpectations(expectPod *corev1.Pod, pod *corev1.Pod, matchers ...PodMatcher) bool {
	for _, matcher := range matchers {
		if !matcher.Match(expectPod, pod) {
			return false
		}
	}
	return true
}
