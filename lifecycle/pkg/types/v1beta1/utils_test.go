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

package v1beta1

import "testing"

func TestReplaceRootfsImageWithSameVersionRebuild(t *testing.T) {
	cluster := &Cluster{}
	cluster.Spec.Image = []string{
		"example/kubernetes:original",
		"example/patch:v1",
		"example/kubernetes:rebuilt",
	}
	cluster.Status.Mounts = []MountImage{
		{
			Type:      RootfsImage,
			ImageName: "example/kubernetes:original",
			Labels:    map[string]string{ImageKubeVersionKey: "v1.28.15"},
		},
		{
			Type:      PatchImage,
			ImageName: "example/patch:v1",
		},
		{
			Type:      RootfsImage,
			ImageName: "example/kubernetes:rebuilt",
			Labels:    map[string]string{ImageKubeVersionKey: "v1.28.15"},
		},
	}
	cluster.ReplaceRootfsImage()
	if len(cluster.Status.Mounts) != 2 {
		t.Fatal("old rootfs image was retained")
	}
	if cluster.GetRootfsImage().ImageName != "example/kubernetes:rebuilt" {
		t.Fatal("subsequent lifecycle operations would use the old rootfs")
	}
	if cluster.Status.Mounts[1].ImageName != "example/patch:v1" {
		t.Fatal("unrelated patch image changed")
	}
	if len(cluster.Spec.Image) != 2 || cluster.Spec.Image[0] != "example/patch:v1" ||
		cluster.Spec.Image[1] != "example/kubernetes:rebuilt" {
		t.Fatalf("desired images still reference the replaced rootfs: %v", cluster.Spec.Image)
	}
}
