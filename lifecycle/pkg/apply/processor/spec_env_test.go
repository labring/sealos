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
	"reflect"
	"testing"

	"github.com/labring/sealos/pkg/buildah"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestMergeSpecEnvIntoMounts(t *testing.T) {
	cluster := &v2.Cluster{}
	cluster.Spec.Env = []string{"FOO=spec", "BAR=spec"}
	cluster.Status.Mounts = []v2.MountImage{
		{Env: map[string]string{"FOO": "image", "BAZ": "image"}},
		{},
	}

	mergeSpecEnvIntoMounts(cluster, map[string]string{"BAR": "extra"})

	want := []map[string]string{
		{"FOO": "spec", "BAR": "extra", "BAZ": "image"},
		{"FOO": "spec", "BAR": "extra"},
	}
	for i, m := range cluster.Status.Mounts {
		if !reflect.DeepEqual(m.Env, want[i]) {
			t.Errorf("mount %d env = %v, want %v", i, m.Env, want[i])
		}
	}
}

type envInspectBuilder struct {
	rootfsSelectionBuilder
}

func (b *envInspectBuilder) InspectImage(
	name string,
	opts ...string,
) (*buildah.InspectOutput, error) {
	out, err := b.rootfsSelectionBuilder.InspectImage(name, opts...)
	if err != nil {
		return nil, err
	}
	out.OCIv1.Config.Env = []string{"registryData=/var/lib/registry"}
	return out, nil
}

func TestMountImagesForScaleUpMergesSpecEnv(t *testing.T) {
	cluster := &v2.Cluster{}
	cluster.Spec.Image = []string{"example/kubernetes:v1"}
	cluster.Spec.Env = []string{"registryData=/data/x"}
	if err := mountImagesForScaleUp(&envInspectBuilder{}, cluster); err != nil {
		t.Fatal(err)
	}
	if len(cluster.Status.Mounts) == 0 {
		t.Fatal("no mounts created")
	}
	if got := cluster.Status.Mounts[0].Env["registryData"]; got != "/data/x" {
		t.Fatalf("mount env registryData = %q, want /data/x", got)
	}
}
