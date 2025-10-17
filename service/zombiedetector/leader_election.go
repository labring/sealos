package main

import (
	"context"
	"log"
	"os"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/tools/leaderelection"
	"k8s.io/client-go/tools/leaderelection/resourcelock"
)

// runWithLeaderElection runs monitor with leader election
func runWithLeaderElection(
	ctx context.Context,
	monitor *Monitor,
) {
	podName := os.Getenv("POD_NAME")

	podNamespace := os.Getenv("POD_NAMESPACE")
	if podName == "" || podNamespace == "" {
		log.Println("run with leader election is disabled")
		monitor.Start(ctx)
		return
	}

	// Create leader election lock
	lock := &resourcelock.LeaseLock{
		LeaseMeta: metav1.ObjectMeta{
			Name:      leaseName,
			Namespace: podNamespace,
		},
		Client: monitor.clientset.CoordinationV1(),
		LockConfig: resourcelock.ResourceLockConfig{
			Identity: podName,
		},
	}

	// Configure leader election
	leaderElectionConfig := leaderelection.LeaderElectionConfig{
		Lock:          lock,
		LeaseDuration: defaultLeaseDuration,
		RenewDeadline: defaultRenewDeadline,
		RetryPeriod:   defaultRetryPeriod,
		Callbacks: leaderelection.LeaderCallbacks{
			OnStartedLeading: func(ctx context.Context) {
				log.Println("Became leader, starting monitoring...")
				monitor.Start(ctx)
			},
			OnStoppedLeading: func() {
				log.Println("Lost leadership, stopping monitoring...")
			},
			OnNewLeader: func(identity string) {
				if identity == podName {
					return
				}
				log.Printf("New leader elected: %s", identity)
			},
		},
		ReleaseOnCancel: true,
	}

	// Run leader election
	leaderelection.RunOrDie(ctx, leaderElectionConfig)
}
