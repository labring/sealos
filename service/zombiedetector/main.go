package main

import (
	"context"
	"log"
	"os"

	"k8s.io/client-go/rest"
)

func main() {
	// Set log format
	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	// Get Feishu webhook URL from environment variable
	feishuWebhook := os.Getenv("FEISHU_WEBHOOK_URL")
	if feishuWebhook == "" {
		log.Fatal("FEISHU_WEBHOOK_URL environment variable is required")
	}

	// Use in-cluster config (for ServiceAccount)
	config, err := rest.InClusterConfig()
	if err != nil {
		log.Fatalf("Failed to create in-cluster config: %v", err)
	}

	// Create monitor
	monitor, err := NewMonitor(
		config,
		feishuWebhook,
		WithClusterName(os.Getenv("CLUSTER_NAME")),
		WithCheckInterval(getEnvDuration("CHECK_INTERVAL")),
		WithAlertThreshold(getEnvDuration("ALERT_THRESHOLD")),
		WithAlertInterval(getEnvDuration("ALERT_INTERVAL")),
	)
	if err != nil {
		log.Fatalf("Failed to create monitor: %v", err)
	}

	// Create cancellable context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Handle system signals
	handleSignals(cancel)

	// Start health check server
	go startHealthServer()

	// Start monitoring (with leader election)
	log.Println("Node zombie detector starting with leader election...")
	runWithLeaderElection(ctx, monitor)
	log.Println("Node zombie detector stopped")
}
