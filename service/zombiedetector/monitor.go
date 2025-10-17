package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"time"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	metricsv1beta1 "k8s.io/metrics/pkg/apis/metrics/v1beta1"
	metricsclientset "k8s.io/metrics/pkg/client/clientset/versioned"
)

// Monitor K8s node monitor
type Monitor struct {
	clusterName      string
	clientset        *kubernetes.Clientset
	metricsClientset *metricsclientset.Clientset
	feishuWebhook    string
	checkInterval    time.Duration
	alertThreshold   time.Duration
	alertInterval    time.Duration
	httpClient       *http.Client
}

type MonitorConfigFunc func(m *Monitor)

func WithCheckInterval(interval time.Duration) MonitorConfigFunc {
	return func(m *Monitor) {
		if interval <= 0 {
			return
		}

		m.checkInterval = interval
	}
}

func WithAlertThreshold(threshold time.Duration) MonitorConfigFunc {
	return func(m *Monitor) {
		if threshold <= 0 {
			return
		}

		m.alertThreshold = threshold
	}
}

func WithAlertInterval(interval time.Duration) MonitorConfigFunc {
	return func(m *Monitor) {
		if interval <= 0 {
			return
		}

		m.alertInterval = interval
	}
}

func WithClusterName(name string) MonitorConfigFunc {
	return func(m *Monitor) {
		m.clusterName = name
	}
}

// NewMonitor creates a new monitor instance
func NewMonitor(
	config *rest.Config,
	feishuWebhook string,
	opts ...MonitorConfigFunc,
) (*Monitor, error) {
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	metricsClientset, err := metricsclientset.NewForConfig(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create metrics client: %w", err)
	}

	m := Monitor{
		clientset:        clientset,
		metricsClientset: metricsClientset,
		feishuWebhook:    feishuWebhook,
		checkInterval:    defaultCheckInterval,
		alertThreshold:   defaultAlertThreshold,
		alertInterval:    defaultAlertInterval,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}

	for _, opt := range opts {
		opt(&m)
	}

	return &m, nil
}

// Start begins monitoring
func (m *Monitor) Start(ctx context.Context) {
	log.Println("Starting node monitor...")

	ticker := time.NewTicker(m.checkInterval)
	defer ticker.Stop()

	nodeStatus := make(map[string]*NodeStatus)
	m.checkNodes(ctx, nodeStatus)

	for {
		select {
		case <-ctx.Done():
			log.Println("Stopping node monitor...")
			return
		case <-ticker.C:
			m.checkNodes(ctx, nodeStatus)
		}
	}
}

// checkNodes checks all node statuses
func (m *Monitor) checkNodes(ctx context.Context, nodeStatus map[string]*NodeStatus) {
	if ctx.Err() != nil {
		return
	}

	// Get all nodes
	nodes, err := m.clientset.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		log.Printf("Error listing nodes: %v", err)
		return
	}

	// Record currently active nodes
	activeNodes := make(map[string]bool)
	for _, node := range nodes.Items {
		activeNodes[node.Name] = true
	}

	// Clean up deleted nodes' status
	m.cleanupDeletedNodes(activeNodes, nodeStatus)

	nodeMetrics, err := m.metricsClientset.MetricsV1beta1().
		NodeMetricses().
		List(ctx, metav1.ListOptions{})
	if err != nil {
		log.Printf("Error getting node metrics: %v", err)
		return
	}

	// Create metrics map
	metricsMap := make(map[string]*metricsv1beta1.NodeMetrics)
	if nodeMetrics != nil {
		for _, item := range nodeMetrics.Items {
			metricsMap[item.Name] = &item
		}
	}

	// Check each node
	for _, node := range nodes.Items {
		// Only check Ready nodes
		if !isNodeReady(&node) {
			log.Printf("Node %s is not ready, skipping", node.Name)
			continue
		}

		err := m.checkNode(
			ctx,
			&node,
			metricsMap[node.Name],
			nodeStatus,
		)
		if err != nil {
			log.Printf("Error checking node %s: %v", node.Name, err)
		}
	}
}

// cleanupDeletedNodes cleans up status of deleted nodes
func (m *Monitor) cleanupDeletedNodes(
	activeNodes map[string]bool,
	nodeStatus map[string]*NodeStatus,
) {
	for nodeName := range nodeStatus {
		if !activeNodes[nodeName] {
			delete(nodeStatus, nodeName)
			log.Printf("Cleaned up status for deleted node: %s", nodeName)
		}
	}
}

// getOrCreateNodeStatus gets or creates node status
func (m *Monitor) getOrCreateNodeStatus(
	nodeName string,
	nodeStatus map[string]*NodeStatus,
) *NodeStatus {
	status, exists := nodeStatus[nodeName]
	if !exists {
		status = &NodeStatus{
			LastSeenWithMetrics: time.Now(),
			LastAlertTime:       time.Time{}, // zero value
		}
		nodeStatus[nodeName] = status
	}

	return status
}

// checkNode checks a single node
func (m *Monitor) checkNode(
	ctx context.Context,
	node *v1.Node,
	metrics *metricsv1beta1.NodeMetrics,
	nodeStatus map[string]*NodeStatus,
) error {
	nodeName := node.Name
	hasMetrics := metrics != nil

	// Get or create node status
	status := m.getOrCreateNodeStatus(nodeName, nodeStatus)

	// If node has metrics, update last seen time
	if hasMetrics {
		status.LastSeenWithMetrics = time.Now()

		log.Printf("Node %s: CPU=%s, Memory=%s",
			nodeName,
			metrics.Usage.Cpu().String(),
			metrics.Usage.Memory().String())

		return nil
	}

	// Only log when API is working but node has no metrics
	log.Printf("Node %s: Metrics=<unknown> (API is working)", nodeName)

	timeSinceLastMetrics := time.Since(status.LastSeenWithMetrics)

	if timeSinceLastMetrics < m.alertThreshold {
		return nil
	}

	timeSinceLastAlert := time.Since(status.LastAlertTime)

	// Avoid duplicate alerts
	if !status.LastAlertTime.IsZero() && timeSinceLastAlert < m.alertInterval {
		return nil
	}

	status.LastAlertTime = time.Now()

	return m.sendAlert(ctx, nodeName, timeSinceLastMetrics)
}

// isNodeReady checks if node is in Ready status
func isNodeReady(node *v1.Node) bool {
	for _, condition := range node.Status.Conditions {
		if condition.Type == v1.NodeReady {
			return condition.Status == v1.ConditionTrue
		}
	}

	return false
}
