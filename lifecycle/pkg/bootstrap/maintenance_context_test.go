// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package bootstrap

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/labring/sealos/pkg/exec"
)

type contextExecer struct {
	exec.Interface
	seen context.Context
}

func (e *contextExecer) CmdAsyncWithContext(ctx context.Context, _ string, _ ...string) error {
	e.seen = ctx
	return nil
}

func TestBootstrapCommandUsesMaintenanceDeadline(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Minute)
	defer cancel()
	inner := &contextExecer{}
	execer := &maintenanceExecer{Interface: inner, context: ctx}
	if err := execer.CmdAsync("worker", "cleanup"); err != nil {
		t.Fatal(err)
	}
	if inner.seen != ctx {
		t.Fatal("bootstrap discarded the lifecycle context")
	}
	inner.seen = nil
	cancel()
	if err := execer.CmdAsync("worker", "next step"); !errors.Is(err, context.Canceled) {
		t.Fatalf("continued after cancellation: %v", err)
	}
	if inner.seen != nil {
		t.Fatal("executed a command after losing the maintenance lease")
	}
}
