// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

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
