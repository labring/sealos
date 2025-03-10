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

package server

import (
	"context"

	"github.com/docker/docker/api/types"

	"github.com/google/go-containerregistry/pkg/name"

	api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

type v1ImageService struct {
	imageClient       api.ImageServiceClient
	CRIConfigs        map[string]types.AuthConfig
	OfflineCRIConfigs map[string]types.AuthConfig
}

func ToV1AuthConfig(c *types.AuthConfig) *api.AuthConfig {
	return &api.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}

func (s *v1ImageService) ListImages(ctx context.Context,
	req *api.ListImagesRequest) (*api.ListImagesResponse, error) {
	logger.Debug("ListImages: %+v", req)
	rsp, err := s.imageClient.ListImages(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) ImageStatus(ctx context.Context,
	req *api.ImageStatusRequest) (*api.ImageStatusResponse, error) {
	logger.Debug("ImageStatus: %+v", req)
	if req.Image != nil {
		if id, _ := s.GetImageRefByID(ctx, req.Image.Image); id != "" {
			req.Image.Image = id
		} else {
			req.Image.Image, _, _ = replaceImage(req.Image.Image, "ImageStatus", s.OfflineCRIConfigs)
		}
	}
	rsp, err := s.imageClient.ImageStatus(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) PullImage(ctx context.Context,
	req *api.PullImageRequest) (*api.PullImageResponse, error) {
	logger.Debug("PullImage begin: %+v", req)
	if req.Image != nil {
		imageName, ok, auth := replaceImage(req.Image.Image, "PullImage", s.OfflineCRIConfigs)
		if ok {
			req.Auth = ToV1AuthConfig(auth)
		} else {
			if req.Auth == nil {
				ref, _ := name.ParseReference(imageName)
				if v, ok := s.CRIConfigs[ref.Context().RegistryStr()]; ok {
					req.Auth = ToV1AuthConfig(&v)
				}
			}
		}
		req.Image.Image = imageName
	}
	logger.Debug("PullImage after: %+v", req)
	rsp, err := s.imageClient.PullImage(ctx, req)
	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) RemoveImage(ctx context.Context,
	req *api.RemoveImageRequest) (*api.RemoveImageResponse, error) {
	logger.Debug("RemoveImage: %+v", req)
	if req.Image != nil {
		if id, _ := s.GetImageRefByID(ctx, req.Image.Image); id != "" {
			req.Image.Image = id
		} else {
			req.Image.Image, _, _ = replaceImage(req.Image.Image, "RemoveImage", s.OfflineCRIConfigs)
		}
	}
	rsp, err := s.imageClient.RemoveImage(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) ImageFsInfo(ctx context.Context,
	req *api.ImageFsInfoRequest) (*api.ImageFsInfoResponse, error) {
	logger.Debug("ImageFsInfo: %+v", req)
	rsp, err := s.imageClient.ImageFsInfo(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *v1ImageService) GetImageRefByID(ctx context.Context, image string) (string, error) {
	resp, err := s.imageClient.ImageStatus(ctx, &api.ImageStatusRequest{
		Image: &api.ImageSpec{
			Image: image,
		},
	})
	if err != nil {
		logger.Warn("Failed to get image %s status: %v", image, err)
		return "", err
	}
	if resp.Image == nil {
		return "", nil
	}
	return resp.Image.Id, nil
}
