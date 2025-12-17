package main

import (
	"strings"

	corev1 "k8s.io/api/core/v1"
)

func getNodeName(pod *corev1.Pod) string {
	if pod.Spec.NodeName != "" {
		return pod.Spec.NodeName
	}
	return ""
}

func isPublicRegistry(image string) bool {
	if !strings.Contains(image, "/") {
		return true
	}

	return strings.HasPrefix(image, "docker.io/") ||
		strings.HasPrefix(image, "gcr.io/") ||
		strings.HasPrefix(image, "ghcr.io/") ||
		strings.HasPrefix(image, "k8s.gcr.io/") ||
		strings.HasPrefix(image, "quay.io/") ||
		strings.HasPrefix(image, "registry.k8s.io/") ||
		(strings.HasPrefix(image, "registry.") && strings.Contains(image, ".aliyuncs.com/")) ||
		(strings.HasPrefix(image, "hub.") && strings.Contains(image, ".sealos.run/")) ||
		strings.HasPrefix(image, "sealos.hub") ||
		strings.Contains(image, ".cr.aliyuncs.com/")
}

func parseRegistry(image string) string {
	if image == "" {
		return "unknown"
	}

	parts := strings.Split(image, "/")
	if len(parts) > 1 && strings.Contains(parts[0], ".") {
		return parts[0]
	}

	return "docker.io"
}
