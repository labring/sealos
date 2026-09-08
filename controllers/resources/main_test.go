package main

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/manager"
)

var _ manager.LeaderElectionRunnable = monitorRunnable{}

func TestMonitorInitializationCancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := monitorInitializationError(
		ctx,
		"connect",
		fmt.Errorf("ping: %w", ctx.Err()),
	); err != nil {
		t.Fatalf("cancellation should stop cleanly: %v", err)
	}
	failure := errors.New("authentication failed")
	if err := monitorInitializationError(ctx, "connect", failure); !errors.Is(err, failure) {
		t.Fatalf("unrelated initialization failure was lost: %v", err)
	}
	if err := monitorInitializationError(
		context.Background(),
		"connect",
		context.Canceled,
	); err == nil {
		t.Fatal("an active manager must not silently lose its monitor")
	}
}

type cleanupDatabase struct {
	t *testing.T
}

func (db cleanupDatabase) Disconnect(ctx context.Context) error {
	if ctx.Err() != nil {
		db.t.Fatal("cleanup context is already canceled")
	}
	deadline, ok := ctx.Deadline()
	if !ok || time.Until(deadline) > 5*time.Second {
		db.t.Fatal("cleanup must have a bounded deadline")
	}
	return nil
}

func TestMonitorDatabaseCleanupHasDeadline(t *testing.T) {
	disconnectMonitorDatabase(cleanupDatabase{t: t})
}

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
