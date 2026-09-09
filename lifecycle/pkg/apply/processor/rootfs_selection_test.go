// Copyright 2026 sealos.
// SPDX-License-Identifier: Apache-2.0

package processor

import (
	"reflect"
	"testing"

	containerbuildah "github.com/containers/buildah"
	"github.com/labring/sealos/pkg/buildah"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	ociv1 "github.com/opencontainers/image-spec/specs-go/v1"
)

type rootfsSelectionBuilder struct {
	buildah.Interface
	created []string
}

func (b *rootfsSelectionBuilder) InspectImage(
	name string,
	_ ...string,
) (*buildah.InspectOutput, error) {
	imageType := v2.RootfsImage
	if name == "example/patch:v1" {
		imageType = v2.PatchImage
	}
	return &buildah.InspectOutput{
		OCIv1: &ociv1.Image{
			Config: ociv1.ImageConfig{
				Labels: map[string]string{
					v2.ImageTypeKeys[0]:    string(imageType),
					v2.ImageVersionKeys[0]: v2.ImageVersionList[0],
					v2.ImageKubeVersionKey: "v1.28.15",
				},
			},
		},
	}, nil
}

func (b *rootfsSelectionBuilder) Pull(_ []string, _ ...buildah.FlagSetter) error {
	return nil
}

func (b *rootfsSelectionBuilder) Create(
	name, image string,
	_ ...buildah.FlagSetter,
) (containerbuildah.BuilderInfo, error) {
	b.created = append(b.created, image)
	return containerbuildah.BuilderInfo{Container: name, MountPoint: "/rootfs"}, nil
}

func TestScaleRetainsCommittedRootfsFromLegacyImageList(t *testing.T) {
	cluster := &v2.Cluster{}
	cluster.Spec.Image = []string{
		"example/kubernetes:old",
		"example/patch:v1",
		"example/kubernetes:active",
	}
	cluster.Status.Mounts = []v2.MountImage{
		{
			Type:      v2.RootfsImage,
			ImageName: "example/kubernetes:active",
		},
	}
	builder := &rootfsSelectionBuilder{}
	if err := MountClusterImages(builder, cluster, true); err != nil {
		t.Fatal(err)
	}
	want := []string{"example/patch:v1", "example/kubernetes:active"}
	if !reflect.DeepEqual(builder.created, want) {
		t.Fatalf("scale mounted obsolete rootfs: %v", builder.created)
	}
	if !reflect.DeepEqual([]string(cluster.Spec.Image), want) {
		t.Fatalf("obsolete image retained in inventory: %v", cluster.Spec.Image)
	}
	if rootfs := cluster.GetRootfsImage(); rootfs.ImageName != "example/kubernetes:active" {
		t.Fatalf("scale changed active rootfs to %s", rootfs.ImageName)
	}
}
