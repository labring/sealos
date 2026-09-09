// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package clusterfile

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"

	"github.com/labring/sealos/pkg/constants"
)

func TestJoinPreflightSurvivesOnlySameOperation(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	name := "join-test"
	path := constants.Clusterfile(name)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte("committed inventory"), 0o600); err != nil {
		t.Fatal(err)
	}
	operation := LifecycleOperation{
		Action:  "apply",
		Request: "first-join",
		Hosts:   []string{"192.0.2.10"},
	}
	hosts := []string{"192.0.2.10:22"}
	failure := errors.New("bootstrap interrupted")
	checks := 0
	rootfsChecks := 0
	// The callback has the production preflight signature, including its error result.
	check := func(pending []string) error { //nolint:unparam
		checks++
		if len(pending) != 1 || pending[0] != hosts[0] {
			t.Fatalf("unexpected preflight hosts: %v", pending)
		}
		return nil
	}
	for attempt := range 2 {
		err := WithLifecycle(
			context.Background(),
			name,
			operation,
			false,
			func(context.Context) error {
				if err := WithJoinPreflight(name, hosts, check); err != nil {
					return err
				}
				if err := WithRootfsPreflight(name, hosts, func([]string) error {
					rootfsChecks++
					return nil
				}); err != nil {
					return err
				}
				if attempt == 0 {
					return failure
				}
				return nil
			},
		)
		if attempt == 0 && !errors.Is(err, failure) {
			t.Fatalf("expected interrupted bootstrap, got %v", err)
		}
		if attempt == 1 && err != nil {
			t.Fatal(err)
		}
	}
	if checks != 1 {
		t.Fatalf("rechecked containerd after partial installation: %d", checks)
	}
	if rootfsChecks != 1 {
		t.Fatalf("rootfs checks were skipped initially or repeated on retry: %d", rootfsChecks)
	}
	operation.Request = "second-join"
	if err := WithLifecycle(
		context.Background(),
		name,
		operation,
		false,
		func(context.Context) error {
			return WithJoinPreflight(name, hosts, check)
		},
	); err != nil {
		t.Fatal(err)
	}
	if checks != 2 {
		t.Fatal("new operation reused an old host preflight")
	}
}

func TestJoinPreflightRejectsUnknownHostsAndRetainsFailures(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRoot
	})
	name := "join-test"
	journal := lifecycleInventory{
		LifecycleOperation: LifecycleOperation{
			Action: "apply",
			Hosts:  []string{"192.0.2.10"},
		},
	}
	if err := os.MkdirAll(constants.ClusterDir(name), 0o700); err != nil {
		t.Fatal(err)
	}
	if err := WriteMaintenanceJSON(
		filepath.Join(constants.ClusterDir(name), LifecycleFilename),
		journal,
	); err != nil {
		t.Fatal(err)
	}
	if err := WithJoinPreflight(name, []string{"192.0.2.11:22"}, func([]string) error {
		t.Fatal("checked a host outside the operation")
		return nil
	}); err == nil {
		t.Fatal("accepted an unrelated host")
	}
	checks := 0
	failure := errors.New("existing containerd")
	for range 2 {
		err := WithJoinPreflight(name, []string{"192.0.2.10:22"}, func([]string) error {
			checks++
			return failure
		})
		if !errors.Is(err, failure) {
			t.Fatalf("lost installation conflict: %v", err)
		}
	}
	if checks != 2 {
		t.Fatal("failed check incorrectly authorized bootstrap")
	}
}
