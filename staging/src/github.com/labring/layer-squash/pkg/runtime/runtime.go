package runtime

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	imagesutil "github.com/labring/layer-squash/pkg/images"
	"github.com/labring/layer-squash/pkg/options"
	"github.com/labring/layer-squash/pkg/util"

	"github.com/containerd/containerd"
	"github.com/containerd/containerd/content"
	"github.com/containerd/containerd/images"
	"github.com/containerd/containerd/leases"
	"github.com/containerd/containerd/mount"
	"github.com/containerd/containerd/namespaces"
	"github.com/containerd/containerd/rootfs"
	"github.com/containerd/containerd/snapshots"
	"github.com/containerd/errdefs"
	"github.com/containerd/nerdctl/pkg/imgutil"
	"github.com/opencontainers/go-digest"
	"github.com/opencontainers/image-spec/identity"
	"github.com/opencontainers/image-spec/specs-go"
	ocispec "github.com/opencontainers/image-spec/specs-go/v1"
)

type Runtime struct {
	client    *containerd.Client
	namespace string

	differ       containerd.DiffService
	imagestore   images.Store
	contentstore content.Store
	snapshotter  snapshots.Snapshotter
}

func NewRuntime(client *containerd.Client, namespace string) (*Runtime, error) {
	return &Runtime{
		client:       client,
		namespace:    namespace,
		differ:       client.DiffService(),
		imagestore:   client.ImageService(),
		contentstore: client.ContentStore(),
		// use default snapshotter
		snapshotter: client.SnapshotService(""),
	}, nil
}

func (r *Runtime) Squash(ctx context.Context, opt options.Option) error {
	ctx = namespaces.WithNamespace(ctx, r.namespace)
	// init image
	image, err := r.initImage(ctx, opt)
	if err != nil {
		return err
	}
	// generate squash layers
	sLayers, err := r.generateSquashLayer(opt, image)
	if err != nil {
		return err
	}
	remainingLayerCount := len(image.Manifest.Layers) - len(sLayers)
	// Don't gc me and clean the dirty data after 1 hour!
	ctx, done, err := r.client.WithLease(ctx, leases.WithRandomID(), leases.WithExpiration(1*time.Hour))
	if err != nil {
		return fmt.Errorf("failed to create lease for squash: %w", err)
	}
	defer done(ctx)
	// prepare snapshot
	var snapshotKey = util.UniquePart()
	mount, err := r.prepareSnapshot(ctx, snapshotKey)
	if err != nil {
		return err
	}
	// defer r.cleanupSnapshot(ctx, snapshotKey)
	// apply layers to snapshot
	if err := r.applyLayersToSnapshot(ctx, mount, sLayers); err != nil {
		return err
	}
	// diff snapshot to create a new layer
	diffLayerDesc, diffID, err := r.createDiff(ctx, snapshotKey)
	if err != nil {
		return fmt.Errorf("failed to export layer: %w", err)
	}
	// generate remaining base image config
	baseImage, err := r.generateBaseImageConfig(ctx, image, remainingLayerCount)
	if err != nil {
		return err
	}
	// commit snapshot
	snapshotID := identity.ChainID(append(baseImage.RootFS.DiffIDs, diffID)).String()
	// todo add error handling
	r.commitSnapshot(ctx, snapshotID, snapshotKey)
	// generate squash image
	newImage, err := r.generateSquashImage(ctx, opt, baseImage, image.Manifest.Layers[:remainingLayerCount], diffLayerDesc, diffID)
	if err != nil {
		return err
	}
	// create squash image
	if _, err := r.createSquashImage(ctx, newImage); err != nil {
		return err
	}
	return nil
}

func (r *Runtime) prepareSnapshot(ctx context.Context, key string) ([]mount.Mount, error) {
	return r.snapshotter.Prepare(ctx, key, "")
}

func (r *Runtime) initImage(ctx context.Context, opt options.Option) (*imagesutil.Image, error) {
	containerImage, err := r.imagestore.Get(ctx, opt.SourceImageRef)
	if err != nil {
		return &imagesutil.Image{}, err
	}

	clientImage := containerd.NewImage(r.client, containerImage)
	manifest, _, err := imgutil.ReadManifest(ctx, clientImage)
	if err != nil {
		return &imagesutil.Image{}, err
	}
	config, _, err := imgutil.ReadImageConfig(ctx, clientImage)
	if err != nil {
		return &imagesutil.Image{}, err
	}
	resImage := &imagesutil.Image{
		ClientImage: clientImage,
		Config:      config,
		Image:       containerImage,
		Manifest:    manifest,
	}
	return resImage, err
}

func (r *Runtime) generateSquashLayer(opt options.Option, image *imagesutil.Image) ([]ocispec.Descriptor, error) {
	// get the layer descriptors by the layer digest
	if opt.SquashLayerDigest != "" {
		find := false
		var res []ocispec.Descriptor
		for _, layer := range image.Manifest.Layers {
			if layer.Digest.String() == opt.SquashLayerDigest {
				find = true
			}
			if find {
				res = append(res, layer)
			}
		}
		if !find {
			return nil, fmt.Errorf("layer not found")
		}
		return res, nil
	}

	// get the layer descriptors by the layer count
	if opt.SquashLayerCount != 0 && opt.SquashLayerCount <= len(image.Manifest.Layers) {
		return image.Manifest.Layers[len(image.Manifest.Layers)-opt.SquashLayerCount:], nil
	}
	return nil, fmt.Errorf("invalid squash option")
}

func (r *Runtime) applyLayersToSnapshot(ctx context.Context, mount []mount.Mount, layers []ocispec.Descriptor) error {
	for _, layer := range layers {
		if _, err := r.differ.Apply(ctx, layer, mount); err != nil {
			return err
		}
	}
	return nil
}

// createDiff creates a diff from the snapshot
func (r *Runtime) createDiff(ctx context.Context, snapshotName string) (ocispec.Descriptor, digest.Digest, error) {
	newDesc, err := rootfs.CreateDiff(ctx, snapshotName, r.snapshotter, r.differ)
	if err != nil {
		return ocispec.Descriptor{}, "", err
	}
	info, err := r.contentstore.Info(ctx, newDesc.Digest)
	if err != nil {
		return ocispec.Descriptor{}, digest.Digest(""), err
	}
	diffIDStr, ok := info.Labels["containerd.io/uncompressed"]
	if !ok {
		return ocispec.Descriptor{}, digest.Digest(""), fmt.Errorf("invalid differ response with no diffID")
	}
	diffID, err := digest.Parse(diffIDStr)
	if err != nil {
		return ocispec.Descriptor{}, digest.Digest(""), err
	}
	return ocispec.Descriptor{
		MediaType: images.MediaTypeDockerSchema2LayerGzip,
		Digest:    newDesc.Digest,
		Size:      info.Size,
	}, diffID, nil
}

func (r *Runtime) generateBaseImageConfig(ctx context.Context, image *imagesutil.Image, remainingLayerCount int) (ocispec.Image, error) {
	// generate squash image config
	orginalConfig, _, err := imgutil.ReadImageConfig(ctx, image.ClientImage) // aware of img.platform
	if err != nil {
		return ocispec.Image{}, err
	}

	var history []ocispec.History
	var count int
	for _, h := range orginalConfig.History {
		// if empty layer, add to history, be careful with the last layer that is empty
		if h.EmptyLayer {
			history = append(history, h)
			continue
		}
		// if not empty layer, add to history, check if count+1 <= remainingLayerCount to see if we need to add more
		if count+1 <= remainingLayerCount {
			history = append(history, h)
			count++
		} else {
			break
		}
	}
	cTime := time.Now()
	return ocispec.Image{
		Created:  &cTime,
		Author:   orginalConfig.Author,
		Platform: orginalConfig.Platform,
		Config:   orginalConfig.Config,
		RootFS: ocispec.RootFS{
			Type:    orginalConfig.RootFS.Type,
			DiffIDs: orginalConfig.RootFS.DiffIDs[:remainingLayerCount],
		},
		History: history,
	}, nil
}

func (r *Runtime) generateSquashImage(ctx context.Context, opt options.Option, baseImageConfig ocispec.Image, baseImageLayers []ocispec.Descriptor, diffLayerDesc ocispec.Descriptor, diffID digest.Digest) (*images.Image, error) {
	// add diffID and history to baseImage config
	baseImageConfig.RootFS.DiffIDs = append(baseImageConfig.RootFS.DiffIDs, diffID)
	cTime := time.Now()
	baseImageConfig.History = append(baseImageConfig.History, ocispec.History{
		Created: &cTime,
		Comment: fmt.Sprintf("squash layer %s", diffID),
	})

	// generate new image config json
	newConfigJSON, err := json.Marshal(baseImageConfig)
	if err != nil {
		return nil, err
	}
	configDesc := ocispec.Descriptor{
		MediaType:    images.MediaTypeDockerSchema2Config,
		Digest:       digest.FromBytes(newConfigJSON),
		Size:         int64(len(newConfigJSON)),
		Platform:     &baseImageConfig.Platform,
		ArtifactType: baseImageConfig.Architecture,
	}

	err = content.WriteBlob(ctx, r.contentstore, configDesc.Digest.String(), bytes.NewReader(newConfigJSON), configDesc)
	if err != nil {
		return nil, err
	}

	// generate new manifest, manifest json, manifest descriptor
	layers := append(baseImageLayers, diffLayerDesc)
	newMfst := struct {
		MediaType string `json:"mediaType,omitempty"`
		ocispec.Manifest
	}{
		MediaType: images.MediaTypeDockerSchema2Manifest,
		Manifest: ocispec.Manifest{
			Versioned: specs.Versioned{
				SchemaVersion: 2,
			},
			Config: configDesc,
			Layers: layers,
		},
	}
	newMfstJSON, err := json.MarshalIndent(newMfst, "", "    ")
	if err != nil {
		return nil, err
	}
	newMfstDesc := ocispec.Descriptor{
		MediaType:    images.MediaTypeDockerSchema2Manifest,
		Digest:       digest.FromBytes(newMfstJSON),
		Size:         int64(len(newMfstJSON)),
		Platform:     &baseImageConfig.Platform,
		ArtifactType: baseImageConfig.Architecture,
	}

	// labels for the new image layers
	labels := map[string]string{
		"containerd.io/gc.ref.content.0": configDesc.Digest.String(),
	}
	for i, l := range layers {
		labels[fmt.Sprintf("containerd.io/gc.ref.content.%d", i+1)] = l.Digest.String()
	}

	err = content.WriteBlob(ctx, r.contentstore, newMfstDesc.Digest.String(), bytes.NewReader(newMfstJSON), newMfstDesc, content.WithLabels(labels))
	if err != nil {
		return nil, err
	}

	return &images.Image{
		Name:      opt.TargetImageName,
		Target:    newMfstDesc,
		UpdatedAt: time.Now(),
	}, nil
}

func (r *Runtime) createSquashImage(ctx context.Context, newImage *images.Image) (digest.Digest, error) {
	if _, err := r.imagestore.Update(ctx, *newImage); err != nil {
		// if err has `not fount` in the message then create the image, otherwise return the error
		if !strings.HasSuffix(err.Error(), errdefs.ErrNotFound.Error()) {
			return digest.Digest(""), fmt.Errorf("failed to update new image %s: %w", newImage.Name, err)
		}
		if _, err := r.imagestore.Create(ctx, *newImage); err != nil {
			return digest.Digest(""), fmt.Errorf("failed to create new image %s: %w", newImage.Name, err)
		}
	}
	return newImage.Target.Digest, nil
}

func (r *Runtime) commitSnapshot(ctx context.Context, name, key string) error {
	return r.snapshotter.Commit(ctx, name, key)
}

func (r *Runtime) cleanupSnapshot(ctx context.Context, key string) error {
	return r.snapshotter.Remove(ctx, key)
}
