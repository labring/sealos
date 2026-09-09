// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package standalone

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"time"

	"golang.org/x/sys/unix"
)

func maintenance(
	ctx context.Context,
	timeout time.Duration,
	run func(context.Context) error,
) error {
	if runtime.GOOS != "linux" || timeout <= 0 {
		return errors.New("standalone maintenance requires Linux and a positive timeout")
	}
	release, err := lockMaintenance()
	if err != nil {
		return err
	}
	defer release()
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	return run(ctx)
}

// All host maintenance shares this lock. Upgrade retains its per-step timeouts;
// bootstrap, reset, and conversion additionally bound the whole operation.
func lockMaintenance() (func(), error) {
	root := filepath.Dir(CompletedConfigPath)
	if err := os.MkdirAll(root, 0o700); err != nil {
		return nil, err
	}
	lock, err := os.OpenFile(filepath.Join(root, "lock"), os.O_CREATE|os.O_RDWR, 0o600)
	if err != nil {
		return nil, err
	}
	if err := unix.Flock(int(lock.Fd()), unix.LOCK_EX|unix.LOCK_NB); err != nil {
		lock.Close()
		return nil, fmt.Errorf("another control-plane maintenance operation is running: %w", err)
	}
	return func() {
		_ = unix.Flock(int(lock.Fd()), unix.LOCK_UN)
		_ = lock.Close()
	}, nil
}

func maintenanceCommand(ctx context.Context, output io.Writer, name string, args ...string) error {
	// Callers supply maintenance tools and separate arguments without invoking a shell.
	// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
	command := exec.CommandContext(ctx, name, args...)
	command.Stdout = output
	command.Stderr = output
	if err := command.Run(); err != nil {
		return fmt.Errorf("%s %v: %w", filepath.Base(name), args, err)
	}
	return nil
}

// Pending host operations must be resumed before a different maintenance flow
// can consume files that have only been partly installed or removed.
func checkPendingMaintenance(operation string) error {
	for name, path := range map[string]string{
		"bootstrap": bootstrapStatePath,
		"reset":     resetStatePath,
	} {
		if name == operation {
			continue
		}
		data, err := os.ReadFile(path)
		if os.IsNotExist(err) {
			continue
		}
		if err != nil {
			return err
		}
		var state struct {
			Complete bool `json:"Complete"`
		}
		if err := json.Unmarshal(data, &state); err != nil {
			return err
		}
		if !state.Complete && operation != "reset" {
			return fmt.Errorf("standalone %s is incomplete; resume it before %s", name, operation)
		}
	}
	return nil
}
