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
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/labring/sealos/pkg/buildimage"
	"github.com/labring/sealos/pkg/registry"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/logger"

	fileutil "github.com/labring/sealos/pkg/utils/file"

	"github.com/labring/sealos/pkg/image/types"

	"github.com/labring/sealos/pkg/utils/exec"
	json2 "github.com/labring/sealos/pkg/utils/json"
	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"
)

// ImageService is the default service, which is used for image pull/push
type ImageService struct {
}

func (d *ImageService) Tag(src, dst string) error {
	return exec.Cmd("bash", "-c", fmt.Sprintf("buildah tag %s %s", src, dst))
}

func (d *ImageService) Save(imageName, archiveName string) error {
	localDir := filepath.Dir(archiveName)
	if !fileutil.IsExist(localDir) {
		return errors.New("archive dir is not exist")
	}
	return exec.Cmd("bash", "-c", fmt.Sprintf("buildah push %s oci-archive:%s:%s", imageName, archiveName, imageName))
}

func (d *ImageService) Load(archiveName string) error {
	if !fileutil.IsExist(archiveName) {
		return errors.New("archive file is not exist")
	}
	return exec.Cmd("bash", "-c", fmt.Sprintf("buildah pull  oci-archive:%s", archiveName))
}

func (d *ImageService) Remove(force bool, images ...string) error {
	var forceCMD string
	if force {
		forceCMD = "-f"
	}
	cmd := fmt.Sprintf("buildah rmi %s %s", forceCMD, strings.Join(images, " "))
	return exec.Cmd("bash", "-c", cmd)
}

func (d *ImageService) Inspect(images ...string) (types.ImageListOCIV1, error) {
	var imageList types.ImageListOCIV1
	for _, image := range images {
		data := exec.BashEval(fmt.Sprintf("buildah inspect %s", image))
		ociImage, err := inspectImage(data)
		if err != nil {
			return nil, err
		}
		imageList = append(imageList, *ociImage)
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

func (d *ImageService) Build(options *types.BuildOptions, contextDir, imageName string) error {
	//contants.ImageShimDirName
	imageFetchDir := path.Join(contextDir, contants.ManifestsDirName)
	yamlImages, err := buildimage.ParseYamlImages(imageFetchDir)
	logger.Info("fetch manifests images: %v", yamlImages)
	if err != nil {
		return errors.Wrap(err, "get images list failed in this context")
	}
	imageListDir := path.Join(contextDir, contants.ImagesDirName, contants.ImageShimDirName)
	images, err := buildimage.LoadImages(imageListDir)
	if err != nil {
		return errors.Wrap(err, "load images list failed in this context")
	}
	images = append(images, yamlImages...)
	auths, err := registry.GetAuthInfo()
	if err != nil {
		return err
	}
	is := registry.NewImageSaver(context.Background(), auths)
	platform := strings.Split(options.Platform, "/")
	var platformVar v1.Platform
	if len(platform) > 2 {
		platformVar = v1.Platform{
			Architecture: platform[1],
			OS:           platform[0],
			Variant:      platform[2],
		}
	} else {
		platformVar = v1.Platform{
			Architecture: platform[1],
			OS:           platform[0],
		}
	}
	logger.Info("pull images %v for platform is %s", images, strings.Join([]string{platformVar.OS, platformVar.Architecture}, "/"))

	images, err = is.SaveImages(images, path.Join(contextDir, contants.RegistryDirName), platformVar)
	if err != nil {
		return errors.Wrap(err, "save images failed in this context")
	}
	logger.Info("output images %v for platform is %s", images, strings.Join([]string{platformVar.OS, platformVar.Architecture}, "/"))
	options.Tag = imageName
	cmd := fmt.Sprintf("buildah build %s %s", options.String(), contextDir)
	return exec.Cmd("bash", "-c", cmd)
}

func (d *ImageService) Prune() error {
	return exec.Cmd("bash", "-c", "buildah rmi --prune")
}

func (d *ImageService) ListImages() error {
	data, err := exec.RunBashCmd("buildah images")
	_, _ = os.Stdout.Write([]byte(data))
	return err
}

func NewImageService() (types.Service, error) {
	return &ImageService{}, nil
}
