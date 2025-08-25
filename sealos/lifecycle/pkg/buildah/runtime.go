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
	"github.com/spf13/cobra"
)

type Runtime struct {
	storage.Store
	*libimage.Runtime
}

func getRuntimeWithStoreAndSystemContext(store storage.Store, sc *types.SystemContext) (*Runtime, error) {
	libimageRuntime, err := libimage.RuntimeFromStore(store, &libimage.RuntimeOptions{SystemContext: sc})
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
		toImage, _, err := r.Runtime.LookupImage(id, nil)
		if err == nil {
			return toImage.TopLayer(), nil
		}
		lastErr = err
	}

	if diffType&DiffContainer == DiffContainer {
		toCtr, err := r.Store.Container(id)
		if err == nil {
			return toCtr.LayerID, nil
		}
		lastErr = err
	}

	if diffType == DiffAll {
		toLayer, err := r.Store.Layer(id)
		if err == nil {
			return toLayer.ID, nil
		}
		lastErr = err
	}
	return "", fmt.Errorf("%s not found: %w", id, lastErr)
}

func (r *Runtime) PullOrLoadImages(ctx context.Context, args []string, options libimage.CopyOptions) ([]string, error) {
	copyOpts := options
	if copyOpts.Writer == nil {
		copyOpts.Writer = os.Stderr
	}
	var result []string
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
			pullImages, err := r.Runtime.Pull(ctx, ref, config.PullPolicyMissing, &libimage.PullOptions{
				CopyOptions: copyOpts,
			})
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
			images, err := r.Runtime.Load(ctx, ref, &libimage.LoadOptions{
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
