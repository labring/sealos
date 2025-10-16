package main

import (
	"fmt"
	"log"

	corev1 "k8s.io/api/core/v1"
	"k8s.io/client-go/tools/cache"
)

func onPodAddOrUpdate(obj any) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		return
	}

	currentNodeName := getNodeName(pod)
	if currentNodeName == "" {
		// not schedule to any node, skip
		return
	}

	log.Printf(
		"[onPodAddOrUpdate] phase=%s uid=%s node=%s namespace=%s pod=%s containers=%d",
		pod.Status.Phase,
		string(pod.UID),
		currentNodeName,
		pod.Namespace,
		pod.Name,
		len(pod.Status.ContainerStatuses),
	)

	// 遍历 InitContainerStatuses + ContainerStatuses
	for _, cs := range pod.Status.InitContainerStatuses {
		checkSlowPull(pod.Namespace, pod.Name, cs, cs.Image)
	}

	for _, cs := range pod.Status.ContainerStatuses {
		checkSlowPull(pod.Namespace, pod.Name, cs, cs.Image)
	}

	reasons := analyzePodImagePullErrors(currentNodeName, pod)

	podKey := fmt.Sprintf("%s/%s", pod.Namespace, pod.Name)

	piVal, _ := podFailures.LoadOrStore(podKey, &podInfo{
		reasons:   make(map[string]failureInfo),
		podName:   pod.Name,
		namespace: pod.Namespace,
	})

	pi, ok := piVal.(*podInfo)
	if !ok {
		log.Printf("[onPodAddOrUpdate] 无法解析已添加对象类型: %T", piVal)
		return
	}

	pi.mu.Lock()
	defer pi.mu.Unlock()

	pi.namespace = pod.Namespace
	pi.podName = pod.Name

	updateReasons(pi, reasons)
}

func onPodDelete(obj any) {
	pod, ok := obj.(*corev1.Pod)
	if !ok {
		tombstone, ok := obj.(cache.DeletedFinalStateUnknown)
		if !ok {
			log.Printf("[onPodDelete] 无法解析已删除对象类型: %T", obj)
			return
		}

		pod, ok = tombstone.Obj.(*corev1.Pod)
		if !ok {
			log.Printf("[onPodDelete] Tombstone 对象无法转换: %T", tombstone.Obj)
			return
		}
	}

	log.Printf("[onPodDelete] namespace=%s pod=%s", pod.Namespace, pod.Name)

	key := fmt.Sprintf("%s/%s", pod.Namespace, pod.Name)

	reasonsVal, loaded := podFailures.LoadAndDelete(key)
	if loaded {
		pi, ok := reasonsVal.(*podInfo)
		if !ok {
			log.Printf("[onPodDelete] 无法解析已删除对象类型: %T", reasonsVal)
			return
		}

		pi.mu.Lock()
		defer pi.mu.Unlock()

		log.Printf(
			"[onPodDelete] namespace=%s pod=%s cleanup %d reasons",
			pi.namespace,
			pi.podName,
			len(pi.reasons),
		)

		// 使用存储的节点信息进行 Dec 操作,确保在正确的节点上执行
		for containerName, info := range pi.reasons {
			log.Printf(
				"[onPodDelete] Dec gauge: namespace=%s pod=%s container=%s node=%s registry=%s image=%s reason=%s",
				pi.namespace,
				pi.podName,
				containerName,
				info.nodeName,
				info.registry,
				info.image,
				info.reason,
			)
			imagePullFailureGauge.DeleteLabelValues(
				pi.namespace,
				pi.podName,
				info.nodeName,
				info.registry,
				info.image,
				info.reason,
			)
		}
	} else {
		log.Printf("[onPodDelete] pod %s not found in podFailures", key)
	}

	// 清理慢拉取相关的状态
	prefix := key + "/"
	slowPullTimers.Range(newCleanupSlowPullWithPrefixFunc(prefix))
	slowPullTracking.Range(newCleanupSlowPullWithPrefixFunc(prefix))
}

func updateReasons(
	pi *podInfo,
	reasons map[string]failureInfo,
) {
	// 删除旧的原因 - 使用存储的节点信息
	for containerName, oldInfo := range pi.reasons {
		if _, found := reasons[containerName]; !found {
			log.Printf(
				"[UpdateReasons] Dec gauge: namespace=%s pod=%s container=%s node=%s registry=%s image=%s reason=%s",
				pi.namespace,
				pi.podName,
				containerName,
				oldInfo.nodeName,
				oldInfo.registry,
				oldInfo.image,
				oldInfo.reason,
			)
			imagePullFailureGauge.DeleteLabelValues(
				pi.namespace,
				pi.podName,
				oldInfo.nodeName,
				oldInfo.registry,
				oldInfo.image,
				oldInfo.reason,
			)
			delete(pi.reasons, containerName)
		}
	}

	// 添加新的原因
	for containerName, info := range reasons {
		oldInfo, found := pi.reasons[containerName]
		if found {
			// 检查是否需要保留原有的具体原因
			finalReason := info.reason

			// 如果新的原因是 back_off_pulling_image,且其他信息没变,且之前有具体原因,则保留具体原因
			if info.reason == ReasonBackOff &&
				oldInfo.nodeName == info.nodeName &&
				oldInfo.image == info.image &&
				oldInfo.registry == info.registry &&
				isSpecificReason(oldInfo.reason) {
				finalReason = oldInfo.reason
				log.Printf(
					"[UpdateReasons] Preserving specific reason for %s/%s container=%s: keeping '%s' instead of 'back_off_pulling_image'",
					pi.namespace,
					pi.podName,
					containerName,
					oldInfo.reason,
				)
			}

			// 检查是否有变化(节点、失败原因、镜像等)
			if oldInfo.nodeName != info.nodeName || oldInfo.reason != finalReason ||
				oldInfo.image != info.image {
				log.Printf(
					"[UpdateReasons] Info changed for %s/%s container=%s: node=%s->%s, reason=%s->%s, image=%s->%s",
					pi.namespace,
					pi.podName,
					containerName,
					oldInfo.nodeName,
					info.nodeName,
					oldInfo.reason,
					finalReason,
					oldInfo.image,
					info.image,
				)

				// 在旧信息上 Dec
				imagePullFailureGauge.DeleteLabelValues(
					pi.namespace,
					pi.podName,
					oldInfo.nodeName,
					oldInfo.registry,
					oldInfo.image,
					oldInfo.reason,
				)
				// 在新信息上 Inc
				imagePullFailureGauge.WithLabelValues(pi.namespace, pi.podName, info.nodeName, info.registry, info.image, finalReason).
					Set(1)

				// 更新存储的信息,使用最终确定的原因
				info.reason = finalReason
				pi.reasons[containerName] = info
			} else if oldInfo.reason != finalReason {
				// 只有原因发生变化的情况
				log.Printf(
					"[UpdateReasons] Only reason changed for %s/%s container=%s: %s->%s",
					pi.namespace,
					pi.podName,
					containerName,
					oldInfo.reason,
					finalReason,
				)

				imagePullFailureGauge.DeleteLabelValues(
					pi.namespace,
					pi.podName,
					oldInfo.nodeName,
					oldInfo.registry,
					oldInfo.image,
					oldInfo.reason,
				)
				imagePullFailureGauge.WithLabelValues(pi.namespace, pi.podName, info.nodeName, info.registry, info.image, finalReason).
					Set(1)

				info.reason = finalReason
				pi.reasons[containerName] = info
			}

			continue
		}

		// 全新的失败容器
		log.Printf(
			"[UpdateReasons] Inc gauge: namespace=%s pod=%s container=%s node=%s registry=%s image=%s reason=%s",
			pi.namespace,
			pi.podName,
			containerName,
			info.nodeName,
			info.registry,
			info.image,
			info.reason,
		)
		imagePullFailureGauge.WithLabelValues(pi.namespace, pi.podName, info.nodeName, info.registry, info.image, info.reason).
			Set(1)

		pi.reasons[containerName] = info
	}
}
