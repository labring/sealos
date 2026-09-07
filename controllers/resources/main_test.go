package main

import (
	"context"
	"testing"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/manager"
)

var _ manager.LeaderElectionRunnable = monitorRunnable{}

func TestMonitorRequiresLeaderElection(t *testing.T) {
	if !(monitorRunnable{}).NeedLeaderElection() {
		t.Fatal("monitor must run only on the elected leader")
	}
}

func TestMonitorMaintenanceStopsBeforeFirstRun(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	done := make(chan struct{})
	called := false
	go func() {
		defer close(done)
		runMonitorMaintenance(ctx, func() { called = true })
	}()
	select {
	case <-done:
		if called {
			t.Fatal("maintenance ran after cancellation")
		}
	case <-time.After(time.Second):
		t.Fatal("maintenance did not stop")
	}
}
