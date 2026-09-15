package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"sigs.k8s.io/controller-runtime/pkg/manager"
)

func TestWorkspaceTasksRequireLeadershipAndWaitForShutdown(t *testing.T) {
	account := &AccountReconciler{Logger: logr.Discard()}
	tasks := map[string]interface {
		manager.Runnable
		manager.LeaderElectionRunnable
	}{
		"traffic": &WorkspaceTrafficController{AccountReconciler: account},
		"subscription debt": &WorkspaceSubscriptionDebtProcessor{
			AccountReconciler: account, pollInterval: time.Hour,
		},
	}
	for name, task := range tasks {
		t.Run(name, func(t *testing.T) {
			if !task.NeedLeaderElection() {
				t.Fatal("workspace mutations must require leadership")
			}
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			done := make(chan error, 1)
			go func() { done <- task.Start(ctx) }()
			select {
			case err := <-done:
				t.Fatalf("Start returned before shutdown: %v", err)
			case <-time.After(30 * time.Millisecond):
			}
			cancel()
			select {
			case err := <-done:
				if err != nil {
					t.Fatal(err)
				}
			case <-time.After(time.Second):
				t.Fatal("Start did not return after cancellation")
			}
		})
	}
}
