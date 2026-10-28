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

package kubernetes

import (
	"testing"

	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

func TestKubernetesVersionUsesConfigurationOrRootfsLabel(t *testing.T) {
	for _, test := range []struct {
		name    string
		config  string
		label   string
		images  []string
		version string
	}{
		{
			name:   "explicit kubeadm version",
			config: "v1.28.15", label: "v1.29.9", version: "v1.28.15",
		},
		{
			name:  "legacy configuration with rootfs label",
			label: "v1.28.15", version: "v1.28.15",
		},
		{
			name:   "application tags cannot supply Kubernetes version",
			images: []string{"example.com/cilium:v1.16.9", "example.com/kubernetes:v1.28.15"},
		},
	} {
		t.Run(test.name, func(t *testing.T) {
			cluster := &v2.Cluster{}
			cluster.Spec.Image = test.images
			cluster.Status.Mounts = []v2.MountImage{{
				Type:   v2.RootfsImage,
				Labels: map[string]string{v2.ImageKubeVersionKey: test.label},
			}}
			config := types.NewKubeadmConfig()
			config.KubernetesVersion = test.config
			runtime := &KubeadmRuntime{cluster: cluster, kubeadmConfig: config}
			if got := runtime.getKubeVersion(); got != test.version {
				t.Fatalf("got Kubernetes version %q, want %q", got, test.version)
			}
		})
	}
}
