// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"testing"
)

func TestMaintenanceCancellationPreventsSSHDispatch(t *testing.T) {
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	client := &maintenanceSSH{ctx: canceled}
	if err := client.CmdAsync("unused", "unused"); !errors.Is(err, context.Canceled) {
		t.Fatalf("dispatch after maintenance cancellation: %v", err)
	}
	if err := client.CmdAsyncWithContext(
		context.Background(),
		"unused",
		"unused",
	); !errors.Is(
		err,
		context.Canceled,
	) {
		t.Fatalf("explicit context bypassed maintenance cancellation: %v", err)
	}
	client.ctx = context.Background()
	if err := client.CmdAsyncWithContext(
		canceled,
		"unused",
		"unused",
	); !errors.Is(
		err,
		context.Canceled,
	) {
		t.Fatalf("dispatch after caller cancellation: %v", err)
	}
}
