package main

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// slowPullTimers stores image pull timers
var slowPullTimers sync.Map // key:string -> *time.Timer

// slowPullTracking tracks current slow pull state
var slowPullTracking sync.Map // key: namespace/pod/container -> slowPullInfo

func newCheckSlowPullHandler(
	slowPullTimerKey, ns, podName string,
	cs corev1.ContainerStatus,
	image string,
) func() {
	return func() {
		slowPullTimers.Delete(slowPullTimerKey)

		p2, err := clientset.CoreV1().
			Pods(ns).
			Get(context.Background(), podName, metav1.GetOptions{})
		if err != nil {
			log.Printf("[SlowPull] Failed to get Pod %s/%s: %v", ns, podName, err)
			return
		}

		nodeName := getNodeName(p2)
		if nodeName == "" {
			// not schedule to any node, skip
			return
		}

		for _, newCs := range p2.Status.ContainerStatuses {
			if newCs.Name != cs.Name {
				continue
			}

			// Check if container is still waiting and not in failure state
			if newCs.ContainerID != "" ||
				newCs.State.Waiting == nil ||
				!isImagePullSlowReason(newCs.State.Waiting.Reason) ||
				isBackOffPullingImage(
					newCs.State.Waiting.Reason,
					newCs.State.Waiting.Message,
				) {
				break
			}

			registry := parseRegistry(image)

			// Record slow pull state
			slowPullInfo := slowPullInfo{
				namespace: ns,
				podName:   podName,
				nodeName:  nodeName,
				registry:  registry,
				image:     image,
			}
			slowPullTracking.Store(slowPullTimerKey, slowPullInfo)

			// Increment slow pull metric
			imagePullSlowAlertGauge.WithLabelValues(ns, podName, nodeName, registry, image).
				Set(1)

			log.Printf(
				"[SlowPullAlert] %s/%s container=%s node=%s registry=%s image=%s",
				ns,
				podName,
				cs.Name,
				nodeName,
				registry,
				image,
			)

			break
		}
	}
}

func checkSlowPull(ns, podName string, cs corev1.ContainerStatus, image string) {
	slowPullTimerKey := fmt.Sprintf("%s/%s/%s", ns, podName, cs.Name)

	// Check if in image pull slow state
	if cs.ContainerID != "" ||
		cs.State.Waiting == nil ||
		!isImagePullSlowReason(cs.State.Waiting.Reason) ||
		isBackOffPullingImage(cs.State.Waiting.Reason, cs.State.Waiting.Message) {
		cleanupSlowPull(slowPullTimerKey)

		return
	}

	// Check if a timer is already running
	if _, exists := slowPullTimers.Load(slowPullTimerKey); exists {
		// Timer already exists, no need to create duplicate
		return
	}

	timer := time.AfterFunc(
		5*time.Minute,
		newCheckSlowPullHandler(slowPullTimerKey, ns, podName, cs, image),
	)

	_, loaded := slowPullTimers.LoadOrStore(slowPullTimerKey, timer)
	if loaded {
		timer.Stop()
		log.Printf(
			"[SlowPull] Timer already exists for %s/%s container=%s, stopped duplicate timer",
			ns,
			podName,
			cs.Name,
		)
	}
}

func newCleanupSlowPullWithPrefixFunc(prefix string) func(k, v any) bool {
	return func(k, v any) bool {
		if sk, ok := k.(string); ok && strings.HasPrefix(sk, prefix) {
			cleanupSlowPull(sk)
		}

		return true
	}
}

// cleanupSlowPull cleans up slow pull state
func cleanupSlowPull(slowPullTimerKey string) {
	if val, exists := slowPullTracking.LoadAndDelete(slowPullTimerKey); exists {
		if info, ok := val.(slowPullInfo); ok {
			imagePullSlowAlertGauge.DeleteLabelValues(
				info.namespace,
				info.podName,
				info.nodeName,
				info.registry,
				info.image,
			)
			log.Printf(
				"[SlowPullCleanup] Dec slow pull gauge: namespace=%s pod=%s node=%s registry=%s image=%s",
				info.namespace,
				info.podName,
				info.nodeName,
				info.registry,
				info.image,
			)
		}
	}

	// Also clean up timer
	if val, exists := slowPullTimers.LoadAndDelete(slowPullTimerKey); exists {
		if t, ok := val.(*time.Timer); ok {
			t.Stop()
			log.Printf("[SlowPullCleanup] Stopped timer for key: %s", slowPullTimerKey)
		}
	}
}
