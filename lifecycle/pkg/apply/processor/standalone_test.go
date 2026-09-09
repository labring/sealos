// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package processor

import (
	"errors"
	"os"
	"testing"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type failingStandaloneRuntime struct {
	runtime.Interface
	failure error
	synced  bool
}

func TestStandaloneResetResumesAfterRuntimeWasRemoved(t *testing.T) {
	previousRoot := constants.DefaultRuntimeRootDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	t.Cleanup(func() { constants.DefaultRuntimeRootDir = previousRoot })
	cluster := &v2.Cluster{}
	cluster.Name = "reset-test"
	if err := os.MkdirAll(constants.ClusterDir(cluster.Name), 0o700); err != nil {
		t.Fatal(err)
	}
	runtimeCalls, cleanupCalls := 0, 0
	failCleanup := true
	pipeline := []func(*v2.Cluster) error{
		func(*v2.Cluster) error {
			runtimeCalls++
			return nil
		},
		func(*v2.Cluster) error {
			cleanupCalls++
			if failCleanup {
				return errors.New("unmount failed")
			}
			return nil
		},
	}
	if err := runStandaloneResetPipeline(cluster, pipeline); err == nil {
		t.Fatal("reset swallowed cleanup failure")
	}
	failCleanup = false
	if err := runStandaloneResetPipeline(cluster, pipeline); err != nil {
		t.Fatal(err)
	}
	if runtimeCalls != 1 || cleanupCalls != 2 {
		t.Fatalf(
			"retried already removed runtime: runtime=%d cleanup=%d",
			runtimeCalls,
			cleanupCalls,
		)
	}
}

func (r *failingStandaloneRuntime) ScaleDown([]string, []string) error {
	return r.failure
}

func (r *failingStandaloneRuntime) ScaleUp([]string, []string) error {
	return r.failure
}

func (r *failingStandaloneRuntime) SyncNodeIPVS([]string, []string) error {
	r.synced = true
	return nil
}

func TestStandaloneScaleFailureDoesNotPublishBackends(t *testing.T) {
	failure := errors.New("membership change paused")
	for _, join := range []bool{true, false} {
		rt := &failingStandaloneRuntime{failure: failure}
		processor := &ScaleProcessor{
			Runtime:         rt,
			MastersToJoin:   []string{"192.0.2.2"},
			MastersToDelete: []string{"192.0.2.2"},
		}
		cluster := &v2.Cluster{
			Spec: v2.ClusterSpec{ControlPlaneMode: v2.ControlPlaneModeStandalone},
		}
		operation := processor.Delete
		if join {
			operation = processor.Join
		}
		if err := operation(cluster); !errors.Is(err, failure) {
			t.Fatalf("lost membership failure: %v", err)
		}
		if rt.synced {
			t.Fatal("published desired API backends after membership failure")
		}
	}
}
