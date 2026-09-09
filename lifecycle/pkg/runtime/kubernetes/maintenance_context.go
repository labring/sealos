// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package kubernetes

import (
	"context"

	"github.com/labring/sealos/pkg/ssh"
)

func (k *KubeadmRuntime) SetMaintenanceContext(ctx context.Context) {
	if ctx == nil || !k.cluster.IsStandaloneControlPlane() {
		return
	}
	k.execer = &maintenanceSSH{Interface: k.execer, ctx: ctx}
	k.remoteUtil = ssh.NewRemoteFromSSH(k.cluster.Name, k.execer)
}

type maintenanceSSH struct {
	ssh.Interface
	ctx context.Context
}

func (s *maintenanceSSH) CmdAsync(host string, commands ...string) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}
	return s.Interface.CmdAsyncWithContext(s.ctx, host, commands...)
}

func (s *maintenanceSSH) CmdAsyncWithContext(
	ctx context.Context,
	host string,
	commands ...string,
) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	stop := context.AfterFunc(s.ctx, cancel)
	defer stop()
	return s.Interface.CmdAsyncWithContext(ctx, host, commands...)
}

func (s *maintenanceSSH) CmdToString(host, command, separator string) (string, error) {
	if err := s.ctx.Err(); err != nil {
		return "", err
	}
	return s.Interface.CmdToString(host, command, separator)
}

func (s *maintenanceSSH) Cmd(host, command string) ([]byte, error) {
	if err := s.ctx.Err(); err != nil {
		return nil, err
	}
	return s.Interface.Cmd(host, command)
}

func (s *maintenanceSSH) Copy(host, source, target string) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}
	return s.Interface.Copy(host, source, target)
}

func (s *maintenanceSSH) Fetch(host, source, target string) error {
	if err := s.ctx.Err(); err != nil {
		return err
	}
	return s.Interface.Fetch(host, source, target)
}
