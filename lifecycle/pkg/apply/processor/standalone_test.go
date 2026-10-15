// Copyright © 2026 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

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

func TestResetContinuesCleanupAfterFailure(t *testing.T) {
	previousRuntimeRoot := constants.DefaultRuntimeRootDir
	previousRootfs := constants.DefaultClusterRootFsDir
	constants.DefaultRuntimeRootDir = t.TempDir()
	constants.DefaultClusterRootFsDir = t.TempDir()
	t.Cleanup(func() {
		constants.DefaultRuntimeRootDir = previousRuntimeRoot
		constants.DefaultClusterRootFsDir = previousRootfs
	})
	for _, mode := range []string{"", v2.ControlPlaneModeStandalone} {
		t.Run(mode, func(t *testing.T) {
			cluster := &v2.Cluster{Spec: v2.ClusterSpec{ControlPlaneMode: mode}}
			cluster.Name = "reset-test"
			paths := []string{
				constants.ClusterDir(cluster.Name),
				constants.NewPathResolver(cluster.Name).Root(),
			}
			for _, path := range paths {
				if err := os.MkdirAll(path, 0o700); err != nil {
					t.Fatal(err)
				}
			}
			processor := &DeleteProcessor{}
			pipeline := []func(*v2.Cluster) error{
				func(*v2.Cluster) error {
					return errors.New("runtime reset failed")
				},
				func(*v2.Cluster) error {
					return errors.New("unmount failed")
				},
				processor.CleanFS,
			}
			if err := runResetPipeline(cluster, pipeline); err != nil {
				t.Fatal(err)
			}
			for _, path := range paths {
				if _, err := os.Stat(path); !os.IsNotExist(err) {
					t.Fatalf("reset skipped filesystem cleanup: %v", err)
				}
			}
		})
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
