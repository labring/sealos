// Copyright © 2021 Alibaba Group Holding Ltd.
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
	"testing"

	cbuildah "github.com/containers/buildah"
	ociv1 "github.com/opencontainers/image-spec/specs-go/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type fakeScaleClusterFile struct{}

func (f *fakeScaleClusterFile) Process() error { return nil }

func (f *fakeScaleClusterFile) GetCluster() *v2.Cluster { return nil }

func (f *fakeScaleClusterFile) GetConfigs() []v2.Config { return nil }

func (f *fakeScaleClusterFile) GetRuntimeConfig() runtime.Config { return nil }

type fakeScaleBuildah struct {
	oci *buildah.InspectOutput
}

func (f *fakeScaleBuildah) Pull(_ []string, _ ...buildah.FlagSetter) error { return nil }

func (f *fakeScaleBuildah) Load(string, string) (string, error) { return "", nil }

func (f *fakeScaleBuildah) InspectImage(string, ...string) (*buildah.InspectOutput, error) {
	return f.oci, nil
}

func (f *fakeScaleBuildah) Create(name, _ string, _ ...buildah.FlagSetter) (cbuildah.BuilderInfo, error) {
	return cbuildah.BuilderInfo{Container: name, MountPoint: "/tmp/sealos-scale-test-mount"}, nil
}

func (f *fakeScaleBuildah) Delete(string) error { return nil }

func (f *fakeScaleBuildah) InspectContainer(string) (cbuildah.BuilderInfo, error) {
	return cbuildah.BuilderInfo{}, nil
}

func (f *fakeScaleBuildah) ListContainers() ([]buildah.JSONContainer, error) { return nil, nil }

func (f *fakeScaleBuildah) Runtime() *buildah.Runtime { return nil }

func rootfsInspectOutput() *buildah.InspectOutput {
	return &buildah.InspectOutput{
		OCIv1: &ociv1.Image{
			Config: ociv1.ImageConfig{
				Env: []string{
					"sandboxImage=pause:3.9",
					"registryDomain=sealos.hub",
					"registryPort=5000",
					"registryUsername=admin",
					"registryPassword=passw0rd",
					"registryData=/var/lib/registry",
				},
				Labels: map[string]string{
					"sealos.io.type":       string(v2.RootfsImage),
					"sealos.io.version":    v2.ImageTypeVersionKeyV1Beta1,
					v2.ImageKubeVersionKey: "v1.29.9",
				},
			},
		},
	}
}

func scaleUpCluster(withExistingOCIMounts bool) *v2.Cluster {
	cluster := &v2.Cluster{
		ObjectMeta: metav1.ObjectMeta{Name: "sealos-prod"},
		Spec: v2.ClusterSpec{
			Image: v2.ImageList{"kubernetes:v1.29.9"},
			Env: []string{
				"sandboxImage=skynet/sealos/pause:3.9",
				"registryPassword=Passw0rd!",
				"registryData=/data/kubernetes/registry",
			},
			Hosts: []v2.Host{{
				IPS:   []string{"192.168.0.10:22"},
				Roles: []string{v2.MASTER},
			}},
		},
	}
	if withExistingOCIMounts {
		cluster.Status.Mounts = []v2.MountImage{{
			Name:      "rootfs-ctr",
			Type:      v2.RootfsImage,
			ImageName: "kubernetes:v1.29.9",
			Env: map[string]string{
				"sandboxImage":     "pause:3.9",
				"registryDomain":   "sealos.hub",
				"registryPassword": "passw0rd",
				"registryData":     "/var/lib/registry",
			},
			Labels: map[string]string{
				"sealos.io.type":       string(v2.RootfsImage),
				"sealos.io.version":    v2.ImageTypeVersionKeyV1Beta1,
				v2.ImageKubeVersionKey: "v1.29.9",
			},
		}}
	}
	return cluster
}

func assertScaleUpMergedSpecEnv(t *testing.T, cluster *v2.Cluster) {
	t.Helper()
	if len(cluster.Status.Mounts) == 0 {
		t.Fatal("scale-up preProcess did not populate Status.Mounts")
	}
	env := cluster.Status.Mounts[0].Env
	if env["sandboxImage"] != "skynet/sealos/pause:3.9" {
		t.Errorf("sandboxImage = %q, want Clusterfile spec.env override", env["sandboxImage"])
	}
	if env["registryPassword"] != "Passw0rd!" {
		t.Errorf("registryPassword = %q, want Clusterfile spec.env override", env["registryPassword"])
	}
	if env["registryData"] != "/data/kubernetes/registry" {
		t.Errorf("registryData = %q, want Clusterfile spec.env override", env["registryData"])
	}
	if env["registryDomain"] != "sealos.hub" {
		t.Errorf("registryDomain = %q, want OCI image env to remain", env["registryDomain"])
	}
}

func TestScaleProcessor_preProcess_mergesClusterfileSpecEnvIntoMounts(t *testing.T) {
	tests := []struct {
		name                  string
		withExistingOCIMounts bool
	}{
		{name: "remount from empty status", withExistingOCIMounts: false},
		{name: "remount over existing OCI mounts", withExistingOCIMounts: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			prev := constants.DefaultRuntimeRootDir
			constants.DefaultRuntimeRootDir = t.TempDir()
			t.Cleanup(func() { constants.DefaultRuntimeRootDir = prev })

			cluster := scaleUpCluster(tt.withExistingOCIMounts)
			p := &ScaleProcessor{
				ClusterFile: &fakeScaleClusterFile{},
				Buildah:     &fakeScaleBuildah{oci: rootfsInspectOutput()},
				IsScaleUp:   true,
			}
			if err := p.preProcess(cluster); err != nil {
				t.Fatalf("preProcess() error = %v", err)
			}
			assertScaleUpMergedSpecEnv(t, cluster)
		})
	}
}
