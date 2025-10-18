// Copyright © 2023 sealos.
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

package buildah

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/containers/buildah/pkg/parse"
	"github.com/containers/common/libimage"
	"github.com/containers/common/pkg/config"
	imagestorage "github.com/containers/image/v5/storage"
	"github.com/containers/image/v5/types"
	"github.com/containers/storage"
	"github.com/containers/storage/pkg/archive"
	"github.com/spf13/cobra"
)

type Runtime struct {
	storage.Store
	*libimage.Runtime
}

func getRuntimeWithStoreAndSystemContext(
	store storage.Store,
	sc *types.SystemContext,
) (*Runtime, error) {
	libimageRuntime, err := libimage.RuntimeFromStore(
		store,
		&libimage.RuntimeOptions{SystemContext: sc},
	)
	if err != nil {
		return nil, err
	}
	return &Runtime{
		Store:   store,
		Runtime: libimageRuntime,
	}, nil
}

func getRuntime(c *cobra.Command) (*Runtime, error) {
	if c == nil {
		c = rootCmd
	}
	store, err := getStore(c)
	if err != nil {
		return nil, err
	}
	sc, err := parse.SystemContextFromOptions(c)
	if err != nil {
		return nil, fmt.Errorf("building system context: %w", err)
	}
	return getRuntimeWithStoreAndSystemContext(store, sc)
}

func (r *Runtime) getLayerID(id string, diffType DiffType) (string, error) {
	var lastErr error
	if diffType&DiffImage == DiffImage {
		toImage, _, err := r.LookupImage(id, nil)
		if err == nil {
			return toImage.TopLayer(), nil
		}
		lastErr = err
	}

	if diffType&DiffContainer == DiffContainer {
		toCtr, err := r.Container(id)
		if err == nil {
			return toCtr.LayerID, nil
		}
		lastErr = err
	}

	if diffType == DiffAll {
		toLayer, err := r.Layer(id)
		if err == nil {
			return toLayer.ID, nil
		}
		lastErr = err
	}
	return "", fmt.Errorf("%s not found: %w", id, lastErr)
}

func (r *Runtime) PullOrLoadImages(
	ctx context.Context,
	args []string,
	options libimage.CopyOptions,
) ([]string, error) {
	copyOpts := options
	if copyOpts.Writer == nil {
		copyOpts.Writer = os.Stderr
	}
	result := make([]string, 0, len(args))
	for i := range args {
		name := args[i]
		tr, ref, err := parseTransportAndReference(imagestorage.Transport, name)
		if err != nil {
			return nil, err
		}
		switch tr.Name() {
		case TransportDocker, TransportContainersStorage:
			if tr.Name() == TransportDocker {
				ref = strings.TrimPrefix(ref, "//")
			}
			pullImages, err := r.Pull(
				ctx,
				ref,
				config.PullPolicyMissing,
				&libimage.PullOptions{
					CopyOptions: copyOpts,
				},
			)
			if err != nil {
				return nil, err
			}
			name = pullImages[0].ID()
			if names := pullImages[0].Names(); len(names) > 0 {
				name = names[0]
			}
		default:
			if !filepath.IsAbs(ref) {
				cwd, err := os.Getwd()
				if err != nil {
					return nil, err
				}
				ref = filepath.Join(cwd, ref)
			}
			images, err := r.Load(ctx, ref, &libimage.LoadOptions{
				CopyOptions: copyOpts,
			})
			if err != nil {
				return nil, err
			}
			name = images[0]
		}
		result = append(result, name)
	}
	return result, nil
}

func (r *Runtime) getLayerIDs(from, to string, diffType DiffType) (string, string, error) {
	fromLayer, err := r.getLayerID(from, diffType)
	if err != nil {
		return "", "", err
	}
	toLayer, err := r.getLayerID(to, diffType)
	if err != nil {
		return "", "", err
	}
	return fromLayer, toLayer, nil
}

// Changes returns a list of changes between two layers.
func (r *Runtime) Changes(from, to string) ([]archive.Change, error) {
	return r.Store.Changes(from, to)
}

// Image returns a specific image from the store.
func (r *Runtime) Image(id string) (*storage.Image, error) {
	return r.Store.Image(id)
}

// DifferTarget gets the path to the differ target for a layer.
func (r *Runtime) DifferTarget(id string) (string, error) {
	return r.Store.DifferTarget(id)
}

// Load loads images from a file into the storage.
func (r *Runtime) Load(
	ctx context.Context,
	path string,
	options *libimage.LoadOptions,
) ([]string, error) {
	return r.Runtime.Load(ctx, path, options)
}

// LookupImage looks up an image by name or ID in the storage.
func (r *Runtime) LookupImage(
	name string,
	options *libimage.LookupImageOptions,
) (*libimage.Image, string, error) {
	return r.Runtime.LookupImage(name, options)
}

// Container returns a specific container from the storage.
func (r *Runtime) Container(id string) (*storage.Container, error) {
	return r.Store.Container(id)
}

// Layer returns a specific layer from the storage.
func (r *Runtime) Layer(id string) (*storage.Layer, error) {
	return r.Store.Layer(id)
}

// Pull pulls images from a registry into the storage.
func (r *Runtime) Pull(
	ctx context.Context,
	name string,
	pullPolicy config.PullPolicy,
	options *libimage.PullOptions,
) ([]*libimage.Image, error) {
	return r.Runtime.Pull(ctx, name, pullPolicy, options)
}

// Save saves images to a file from the storage.
func (r *Runtime) Save(
	ctx context.Context,
	names []string,
	format, output string,
	options *libimage.SaveOptions,
) ([]string, error) {
	err := r.Runtime.Save(ctx, names, format, output, options)
	return names, err
}
