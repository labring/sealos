package main

import (
	"github.com/prometheus/client_golang/prometheus"
)

// Define Prometheus metrics
var (
	//nolint:promlinter
	imagePullFailureGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "k8s_pod_image_pull_failure_total",
			Help: "Number of pods with image pull failures categorized by exported_namespace, exported_pod, node, image and reason",
		},
		[]string{"exported_namespace", "exported_pod", "node", "registry", "image", "reason"},
	)
	// Changed to Gauge type, allowing Inc and Dec operations
	//nolint:promlinter
	imagePullSlowAlertGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "k8s_pod_image_pull_slow_total",
			Help: "Number of pods with slow image pull (>=5m), by exported_namespace, exported_pod, node, registry and image",
		},
		[]string{"exported_namespace", "exported_pod", "node", "registry", "image"},
	)
)
