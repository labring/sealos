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
		// 使用容器名作为 key
		reasons[cs.Name] = failureInfo{
			registry: registry,
			nodeName: nodeName,   // 记录当前节点
			image:    cs.Image,   // 记录镜像信息
			reason:   classified, // 记录失败原因
		}

		// 如果是失败状态,清理对应的慢拉取状态
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
