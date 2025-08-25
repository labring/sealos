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

package image

import (
	"context"
	"fmt"

	v1api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

const V1 = "v1"

type FakeImageServiceClient struct {
	Version              string
	V1ImageServiceClient v1api.ImageServiceClient
}

func NewFakeImageServiceClientWithV1(client v1api.ImageServiceClient) FakeImageCRIShimInterface {
	return &FakeImageServiceClient{V1ImageServiceClient: client, Version: V1}
}

type FakeImageCRIShimInterface interface {
	ListImages() ([]string, error)
	ImageStatus(image string) (*v1api.ImageStatusResponse, error)
	PullImage(image string) (string, error)
	RemoveImage(image string) error
	ImageFsInfo() ([]*v1api.FilesystemUsage, error)
}

func (f FakeImageServiceClient) ListImages() ([]string, error) {
	var (
		ctx, cancel   = context.WithCancel(context.Background())
		imageListResp *v1api.ListImagesResponse
		imageList     = []string{}
	)
	defer cancel()
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ListImages(ctx, &v1api.ListImagesRequest{})
		if err != nil {
			return nil, err
		}
		imageListResp = v1ImageListResp
	}
	if imageListResp.Images == nil {
		logger.Info("images is nil: %#+v", imageListResp)
		return nil, nil
	}
	for i := range imageListResp.Images {
		image := imageListResp.Images[i].GetId()
		if imageListResp.Images[i].GetSpec() != nil {
			image = imageListResp.Images[i].GetSpec().GetImage()
		}
		imageList = append(imageList, image)
	}
	return imageList, nil
}

func (f FakeImageServiceClient) ImageStatus(image string) (*v1api.ImageStatusResponse, error) {
	var (
		ctx, cancel = context.WithCancel(context.Background())
	)
	defer cancel()
	v1ImageSpec := &v1api.ImageSpec{Image: image}
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ImageStatus(ctx, &v1api.ImageStatusRequest{Image: v1ImageSpec, Verbose: true})
		if err != nil {
			return nil, err
		}
		return v1ImageListResp, nil
	}
	return nil, fmt.Errorf("not support cri api v1")
}

// return image ID
func (f FakeImageServiceClient) PullImage(image string) (string, error) {
	var (
		ctx, cancel = context.WithCancel(context.Background())
		v1ImageSpec = &v1api.ImageSpec{Image: image}
	)
	defer cancel()
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.PullImage(ctx, &v1api.PullImageRequest{Image: v1ImageSpec})
		if err != nil {
			return "", err
		}
		return v1ImageListResp.ImageRef, nil
	}
	return "", fmt.Errorf("not support cri api v1")
}

func (f FakeImageServiceClient) RemoveImage(image string) error {
	var (
		ctx, cancel = context.WithCancel(context.Background())
	)
	defer cancel()
	v1ImageSpec := &v1api.ImageSpec{Image: image}
	if f.Version == V1 {
		_, err := f.V1ImageServiceClient.RemoveImage(ctx, &v1api.RemoveImageRequest{Image: v1ImageSpec})
		if err != nil {
			return err
		}
		return nil
	}
	return fmt.Errorf("not support cri api v1")
}

func (f FakeImageServiceClient) ImageFsInfo() ([]*v1api.FilesystemUsage, error) {
	var (
		ctx, cancel = context.WithCancel(context.Background())
	)
	defer cancel()
	if f.Version == V1 {
		v1ImageListResp, err := f.V1ImageServiceClient.ImageFsInfo(ctx, &v1api.ImageFsInfoRequest{})
		if err != nil {
			return nil, err
		}
		return v1ImageListResp.ImageFilesystems, nil
	}
	return nil, fmt.Errorf("not support cri api v1")
}
