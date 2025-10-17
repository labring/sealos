package main

import (
	"time"
)

// NodeStatus stores node status information
type NodeStatus struct {
	LastSeenWithMetrics time.Time
	LastAlertTime       time.Time
}

const (
	defaultCheckInterval  = 30 * time.Second
	defaultAlertThreshold = time.Minute
	defaultAlertInterval  = 5 * time.Minute
	defaultLeaseDuration  = 15 * time.Second
	defaultRenewDeadline  = 10 * time.Second
	defaultRetryPeriod    = 2 * time.Second
)

const leaseName = "node-zombie-detector"

// FeishuMessage represents Feishu message structure
type FeishuMessage struct {
	MsgType string         `json:"msg_type"`
	Content map[string]any `json:"content"`
}

const alertFormat = "⚠️ Node Monitor Alert\n\n" +
	"Node Name: %s\n" +
	"Description: Node is Ready, but no metrics data for %v\n" +
	"Alert Time: %s\n"

const alertFormatWithCluster = "⚠️ Node Monitor Alert\n\n" +
	"Cluster Name: %s\n" +
	"Node Name: %s\n" +
	"Description: Node is Ready, but no metrics data for %v\n" +
	"Alert Time: %s\n"
