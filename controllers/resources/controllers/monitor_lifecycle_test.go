package controllers

import (
	"context"
	"testing"
	"time"

	"github.com/go-logr/logr"
	"github.com/labring/sealos/controllers/pkg/database"
)

func TestMonitorStopsDuringInitialTrafficWait(t *testing.T) {
	r := &MonitorReconciler{
		Logger: logr.Discard(), periodicReconcile: time.Hour,
		TrafficClient: &unusedTrafficDatabase{},
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() { done <- r.StartReconciler(ctx) }()
	select {
	case err := <-done:
		t.Fatalf("monitor returned before cancellation: %v", err)
	case <-time.After(30 * time.Millisecond):
	}
	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("monitor did not join its workers after cancellation")
	}
}

type unusedTrafficDatabase struct{ database.Interface }

func TestMonitorBoundaryAlreadyCanceled(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if waitForMonitorBoundary(ctx, time.Hour) {
		t.Fatal("canceled monitor must not start a traffic query")
	}
}
