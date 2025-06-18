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
	"fmt"

	"github.com/docker/docker/api/types"

	"github.com/google/go-containerregistry/pkg/name"

	api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/version"
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

type v1RuntimeService struct{}

func (v v1RuntimeService) Version(ctx context.Context, request *api.VersionRequest) (*api.VersionResponse, error) {
	return &api.VersionResponse{
		Version:           fmt.Sprintf("%s-%s", version.Get().GitVersion, version.Get().GitCommit),
		RuntimeName:       "image-cri-shim",
		RuntimeVersion:    "v1",
		RuntimeApiVersion: "v1",
	}, nil
}

func (v v1RuntimeService) RunPodSandbox(ctx context.Context, request *api.RunPodSandboxRequest) (*api.RunPodSandboxResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) StopPodSandbox(ctx context.Context, request *api.StopPodSandboxRequest) (*api.StopPodSandboxResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) RemovePodSandbox(ctx context.Context, request *api.RemovePodSandboxRequest) (*api.RemovePodSandboxResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) PodSandboxStatus(ctx context.Context, request *api.PodSandboxStatusRequest) (*api.PodSandboxStatusResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ListPodSandbox(ctx context.Context, request *api.ListPodSandboxRequest) (*api.ListPodSandboxResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) CreateContainer(ctx context.Context, request *api.CreateContainerRequest) (*api.CreateContainerResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) StartContainer(ctx context.Context, request *api.StartContainerRequest) (*api.StartContainerResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) StopContainer(ctx context.Context, request *api.StopContainerRequest) (*api.StopContainerResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) RemoveContainer(ctx context.Context, request *api.RemoveContainerRequest) (*api.RemoveContainerResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ListContainers(ctx context.Context, request *api.ListContainersRequest) (*api.ListContainersResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ContainerStatus(ctx context.Context, request *api.ContainerStatusRequest) (*api.ContainerStatusResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) UpdateContainerResources(ctx context.Context, request *api.UpdateContainerResourcesRequest) (*api.UpdateContainerResourcesResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ReopenContainerLog(ctx context.Context, request *api.ReopenContainerLogRequest) (*api.ReopenContainerLogResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ExecSync(ctx context.Context, request *api.ExecSyncRequest) (*api.ExecSyncResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) Exec(ctx context.Context, request *api.ExecRequest) (*api.ExecResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) Attach(ctx context.Context, request *api.AttachRequest) (*api.AttachResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) PortForward(ctx context.Context, request *api.PortForwardRequest) (*api.PortForwardResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ContainerStats(ctx context.Context, request *api.ContainerStatsRequest) (*api.ContainerStatsResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ListContainerStats(ctx context.Context, request *api.ListContainerStatsRequest) (*api.ListContainerStatsResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) PodSandboxStats(ctx context.Context, request *api.PodSandboxStatsRequest) (*api.PodSandboxStatsResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ListPodSandboxStats(ctx context.Context, request *api.ListPodSandboxStatsRequest) (*api.ListPodSandboxStatsResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) UpdateRuntimeConfig(ctx context.Context, request *api.UpdateRuntimeConfigRequest) (*api.UpdateRuntimeConfigResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) Status(ctx context.Context, request *api.StatusRequest) (*api.StatusResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) CheckpointContainer(ctx context.Context, request *api.CheckpointContainerRequest) (*api.CheckpointContainerResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) GetContainerEvents(request *api.GetEventsRequest, eventsServer api.RuntimeService_GetContainerEventsServer) error {
	panic("not implemented")
}

func (v v1RuntimeService) ListMetricDescriptors(ctx context.Context, request *api.ListMetricDescriptorsRequest) (*api.ListMetricDescriptorsResponse, error) {
	panic("not implemented")
}

func (v v1RuntimeService) ListPodSandboxMetrics(ctx context.Context, request *api.ListPodSandboxMetricsRequest) (*api.ListPodSandboxMetricsResponse, error) {
	panic("not implemented")
}
