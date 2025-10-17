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

	// Iterate through InitContainerStatuses + ContainerStatuses
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
		log.Printf("[onPodAddOrUpdate] Unable to parse added object type: %T", piVal)
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
			log.Printf("[onPodDelete] Unable to parse deleted object type: %T", obj)
			return
		}

		pod, ok = tombstone.Obj.(*corev1.Pod)
		if !ok {
			log.Printf("[onPodDelete] Unable to convert tombstone object: %T", tombstone.Obj)
			return
		}
	}

	log.Printf("[onPodDelete] namespace=%s pod=%s", pod.Namespace, pod.Name)

	key := fmt.Sprintf("%s/%s", pod.Namespace, pod.Name)

	reasonsVal, loaded := podFailures.LoadAndDelete(key)
	if loaded {
		pi, ok := reasonsVal.(*podInfo)
		if !ok {
			log.Printf("[onPodDelete] Unable to parse deleted object type: %T", reasonsVal)
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

		// Use stored node information for Dec operation to ensure execution on correct node
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

	// Clean up slow pull related state
	prefix := key + "/"
	slowPullTimers.Range(newCleanupSlowPullWithPrefixFunc(prefix))
	slowPullTracking.Range(newCleanupSlowPullWithPrefixFunc(prefix))
}

func updateReasons(
	pi *podInfo,
	reasons map[string]failureInfo,
) {
	// Remove old reasons - use stored node information
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

	// Add new reasons
	for containerName, info := range reasons {
		oldInfo, found := pi.reasons[containerName]
		if found {
			// Check if we need to preserve the existing specific reason
			finalReason := info.reason

			// If the new reason is back_off_pulling_image, and other info hasn't changed, and there was a specific reason before, preserve the specific reason
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

			// Check if there are changes (node, failure reason, image, etc.)
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

				// Dec on old information
				imagePullFailureGauge.DeleteLabelValues(
					pi.namespace,
					pi.podName,
					oldInfo.nodeName,
					oldInfo.registry,
					oldInfo.image,
					oldInfo.reason,
				)
				// Inc on new information
				imagePullFailureGauge.WithLabelValues(pi.namespace, pi.podName, info.nodeName, info.registry, info.image, finalReason).
					Set(1)

				// Update stored information using the final determined reason
				info.reason = finalReason
				pi.reasons[containerName] = info
			} else if oldInfo.reason != finalReason {
				// Case where only the reason has changed
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

		// Brand new failed container
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
