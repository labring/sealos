package main

import (
	"fmt"
	"sync"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/kubernetes"
)

var (
	podFailures sync.Map // key namespace/pod -> *podInfo
	clientset   *kubernetes.Clientset
)

func checkImagePullError(
	statuses []corev1.ContainerStatus,
	nodeName string,
	pod *corev1.Pod,
	reasons map[string]failureInfo,
) {
	for _, cs := range statuses {
		if cs.State.Waiting == nil ||
			!isImagePullFailureReason(cs.State.Waiting.Reason) ||
			!isPublicRegistry(cs.Image) {
			continue
		}

		classified := classifyFailureReason(
			cs.State.Waiting.Reason,
			cs.State.Waiting.Message,
		)
		registry := parseRegistry(cs.Image)
		// Use container name as key
		reasons[cs.Name] = failureInfo{
			registry: registry,
			nodeName: nodeName,   // Record current node
			image:    cs.Image,   // Record image info
			reason:   classified, // Record failure reason
		}

		// If in failure state, clean up corresponding slow pull state
		key := fmt.Sprintf("%s/%s/%s", pod.Namespace, pod.Name, cs.Name)
		cleanupSlowPull(key)
	}
}

func analyzePodImagePullErrors(nodeName string, pod *corev1.Pod) map[string]failureInfo {
	reasons := make(map[string]failureInfo)

	checkImagePullError(pod.Status.InitContainerStatuses, nodeName, pod, reasons)
	checkImagePullError(pod.Status.ContainerStatuses, nodeName, pod, reasons)

	return reasons
}
