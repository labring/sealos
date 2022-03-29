/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package binary

import (
	"fmt"

	"github.com/fanux/sealos/pkg/image/types"

	"github.com/fanux/sealos/pkg/utils/exec"
	json2 "github.com/fanux/sealos/pkg/utils/json"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
)

// ImageService is the default service, which is used for image pull/push
type ImageService struct {
}

func (d *ImageService) Rename(src, dst string) error {
	panic("implement me")
}

func (d *ImageService) Remove(images ...string) error {
	panic("implement me")
}

func (d *ImageService) Inspect(image string) (*v1.Image, error) {
	data := exec.BashEval(fmt.Sprintf("buildah inspect %s", image))
	return inspectImage(data)
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

func (d *ImageService) Build(options types.BuildOptions, contextDir, imageName string) error {
	panic("implement me")
}

func (d *ImageService) Prune() error {
	panic("implement me")
}

func (d *ImageService) ListImages(opt types.ListOptions) ([]v1.Image, error) {
	panic("implement me")
}

func NewImageService() (types.Service, error) {
	return &ImageService{}, nil
}
