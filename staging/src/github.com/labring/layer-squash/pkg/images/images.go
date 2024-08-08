package images

import (
	"github.com/containerd/containerd"
	"github.com/containerd/containerd/images"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
)

type Image struct {
	ClientImage containerd.Image
	Config      ocispec.Image
	Image       images.Image
	Manifest    *ocispec.Manifest
}
