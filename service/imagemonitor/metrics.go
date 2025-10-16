package main

import (
	"github.com/prometheus/client_golang/prometheus"
)

// 定义Prometheus指标
var (
	imagePullFailureGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "k8s_pod_image_pull_failure_total",
			Help: "Number of pods with image pull failures categorized by exported_namespace, exported_pod, node, image and reason",
		},
		[]string{"exported_namespace", "exported_pod", "node", "registry", "image", "reason"},
	)
	// 改为 Gauge 类型,可以进行 Inc 和 Dec 操作
	imagePullSlowAlertGauge = prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "k8s_pod_image_pull_slow_total",
			Help: "Number of pods with slow image pull (>=5m), by exported_namespace, exported_pod, node, registry and image",
		},
		[]string{"exported_namespace", "exported_pod", "node", "registry", "image"},
	)
)
