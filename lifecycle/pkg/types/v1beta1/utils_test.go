// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package v1beta1

import "testing"

func TestReplaceRootfsImageWithSameVersionRebuild(t *testing.T) {
	cluster := &Cluster{}
	cluster.Spec.Image = []string{"example/kubernetes:original", "example/patch:v1", "example/kubernetes:rebuilt"}
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
	if len(cluster.Spec.Image) != 2 || cluster.Spec.Image[0] != "example/patch:v1" || cluster.Spec.Image[1] != "example/kubernetes:rebuilt" {
		t.Fatalf("desired images still reference the replaced rootfs: %v", cluster.Spec.Image)
	}
}
