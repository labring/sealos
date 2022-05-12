// Copyright © 2022 buildah.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://github.com/containers/buildah/blob/main/LICENSE
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package image

import (
	"encoding/json"

	"github.com/containers/buildah"
	image_types "github.com/containers/image/v5/types"
	"github.com/labring/sealos/pkg/image/types"
	json2 "github.com/labring/sealos/pkg/utils/json"
	"github.com/labring/sealos/pkg/utils/logger"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const (
	inspectTypeContainer = "container"
	inspectTypeImage     = "image"
	inspectTypeManifest  = "manifest"
)

func (d *ImageService) Inspect(images ...string) (types.ImageListOCIV1, error) {
	var builder *buildah.Builder
	var imageList types.ImageListOCIV1
	var err error
	var imageStr string
	ctx := getContext()

	store := *d.store
	systemContext := &image_types.SystemContext{}

	iopts := d.inspectOpts
	for _, image := range images {
		switch iopts.InspectType {
		case inspectTypeContainer:
			builder, err = openBuilder(ctx, store, image)
			if err != nil {
				builder, err = openImage(ctx, systemContext, store, image)
				var manifestErr error
				if err != nil {
					if imageStr, manifestErr = manifestInspect(ctx, store, systemContext, image); manifestErr != nil {
						logger.Error(manifestErr)
						continue
					}
					ociImage, err := inspectImage(imageStr)
					if err != nil {
						continue
					}
					imageList = append(imageList, *ociImage)
					continue
				}
			}
		case inspectTypeImage:
			builder, err = openImage(ctx, systemContext, store, image)
			if err != nil {
				continue
			}
		case inspectTypeManifest:
			imageStr, err = manifestInspect(ctx, store, systemContext, image)
			if err != nil {
				continue
			}
			ociImage, err := inspectImage(imageStr)
			if err != nil {
				continue
			}
			imageList = append(imageList, *ociImage)
			continue

		default:
			logger.Error("the only recognized types are %q and %q", inspectTypeContainer, inspectTypeImage)
			continue
		}
		out := buildah.GetBuildInfo(builder)
		if err != nil {
			logger.Error(err)
		}
		imageList = append(imageList, out.OCIv1)
	}

	return imageList, nil
}

func inspectImage(data string) (*v1.Image, error) {
	if data != "" {
		var outStruct map[string]interface{}
		err := json.Unmarshal([]byte(data), &outStruct)
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from image inspect failed")
		}
		imageData, _, err := unstructured.NestedFieldCopy(outStruct, "OCIv1")
		if err != nil {
			return nil, errors.Wrap(err, "decode out json from OCIv1 object failed")
		}
		img := &v1.Image{}
		err = json2.Convert(imageData, img)
		if err != nil {
			return nil, errors.Wrap(err, "decode OCIv1 to v1.Image failed")
		}
		return img, nil
	}
	return nil, errors.New("inspect output is empty")
}

func newInspectOpts() *types.InspectResults {
	return &types.InspectResults{
		Format:      "",
		InspectType: inspectTypeContainer,
	}
}
