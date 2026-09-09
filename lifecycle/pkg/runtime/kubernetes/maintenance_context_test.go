// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"
	"errors"
	"testing"

	"github.com/labring/sealos/pkg/ssh"
)

func TestMaintenanceCancellationPreventsSSHDispatch(t *testing.T) {
	canceled, cancel := context.WithCancel(context.Background())
	cancel()
	client := &maintenanceSSH{ctx: canceled}
	if err := ssh.WaitReady(client, 6, "unused"); !errors.Is(err, context.Canceled) {
		t.Fatalf("SSH probe after maintenance cancellation: %v", err)
	}
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

type maintenancePingSSH struct {
	stubSSH
	host string
	err  error
}

func (s *maintenancePingSSH) Ping(host string) error {
	s.host = host
	return s.err
}

func TestMaintenancePingPreservesActiveProbe(t *testing.T) {
	failure := errors.New("SSH host unavailable")
	inner := &maintenancePingSSH{err: failure}
	client := &maintenanceSSH{Interface: inner, ctx: context.Background()}
	if err := client.Ping("worker"); !errors.Is(err, failure) {
		t.Fatalf("lost SSH probe error: %v", err)
	}
	if inner.host != "worker" {
		t.Fatalf("probed unexpected host: %s", inner.host)
	}
}
