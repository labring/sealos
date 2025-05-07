/*
Copyright 2024 sealos Corporation

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

	api "k8s.io/cri-api/pkg/apis/runtime/v1"

	"github.com/labring/sealos/pkg/utils/logger"
)

type v1RuntimeService struct {
	runtimeClient api.RuntimeServiceClient
}

func (s *v1RuntimeService) Version(ctx context.Context, req *api.VersionRequest) (*api.VersionResponse, error) {
	logger.Debug("Version: %+v", req)
	return s.runtimeClient.Version(ctx, req)
}

func (s *v1RuntimeService) RunPodSandbox(ctx context.Context, req *api.RunPodSandboxRequest) (*api.RunPodSandboxResponse, error) {
	logger.Debug("RunPodSandbox: %+v", req)
	return s.runtimeClient.RunPodSandbox(ctx, req)
}

func (s *v1RuntimeService) StopPodSandbox(ctx context.Context, req *api.StopPodSandboxRequest) (*api.StopPodSandboxResponse, error) {
	logger.Debug("StopPodSandbox: %+v", req)
	return s.runtimeClient.StopPodSandbox(ctx, req)
}

func (s *v1RuntimeService) RemovePodSandbox(ctx context.Context, req *api.RemovePodSandboxRequest) (*api.RemovePodSandboxResponse, error) {
	logger.Debug("RemovePodSandbox: %+v", req)
	return s.runtimeClient.RemovePodSandbox(ctx, req)
}

func (s *v1RuntimeService) PodSandboxStatus(ctx context.Context, req *api.PodSandboxStatusRequest) (*api.PodSandboxStatusResponse, error) {
	logger.Debug("PodSandboxStatus: %+v", req)
	return s.runtimeClient.PodSandboxStatus(ctx, req)
}

func (s *v1RuntimeService) ListPodSandbox(ctx context.Context, req *api.ListPodSandboxRequest) (*api.ListPodSandboxResponse, error) {
	logger.Debug("ListPodSandbox: %+v", req)
	return s.runtimeClient.ListPodSandbox(ctx, req)
}

func (s *v1RuntimeService) CreateContainer(ctx context.Context, req *api.CreateContainerRequest) (*api.CreateContainerResponse, error) {
	logger.Debug("CreateContainer: %+v", req)
	return s.runtimeClient.CreateContainer(ctx, req)
}

func (s *v1RuntimeService) StartContainer(ctx context.Context, req *api.StartContainerRequest) (*api.StartContainerResponse, error) {
	logger.Debug("StartContainer: %+v", req)
	return s.runtimeClient.StartContainer(ctx, req)
}

func (s *v1RuntimeService) StopContainer(ctx context.Context, req *api.StopContainerRequest) (*api.StopContainerResponse, error) {
	logger.Debug("StopContainer: %+v", req)
	return s.runtimeClient.StopContainer(ctx, req)
}

func (s *v1RuntimeService) RemoveContainer(ctx context.Context, req *api.RemoveContainerRequest) (*api.RemoveContainerResponse, error) {
	logger.Debug("RemoveContainer: %+v", req)
	return s.runtimeClient.RemoveContainer(ctx, req)
}

func (s *v1RuntimeService) ListContainers(ctx context.Context, req *api.ListContainersRequest) (*api.ListContainersResponse, error) {
	logger.Debug("ListContainers: %+v", req)
	return s.runtimeClient.ListContainers(ctx, req)
}

func (s *v1RuntimeService) ContainerStatus(ctx context.Context, req *api.ContainerStatusRequest) (*api.ContainerStatusResponse, error) {
	logger.Debug("ContainerStatus: %+v", req)
	return s.runtimeClient.ContainerStatus(ctx, req)
}

func (s *v1RuntimeService) UpdateContainerResources(ctx context.Context, req *api.UpdateContainerResourcesRequest) (*api.UpdateContainerResourcesResponse, error) {
	logger.Debug("UpdateContainerResources: %+v", req)
	return s.runtimeClient.UpdateContainerResources(ctx, req)
}

func (s *v1RuntimeService) ReopenContainerLog(ctx context.Context, req *api.ReopenContainerLogRequest) (*api.ReopenContainerLogResponse, error) {
	logger.Debug("ReopenContainerLog: %+v", req)
	return s.runtimeClient.ReopenContainerLog(ctx, req)
}

func (s *v1RuntimeService) ExecSync(ctx context.Context, req *api.ExecSyncRequest) (*api.ExecSyncResponse, error) {
	logger.Debug("ExecSync: %+v", req)
	return s.runtimeClient.ExecSync(ctx, req)
}

func (s *v1RuntimeService) Exec(ctx context.Context, req *api.ExecRequest) (*api.ExecResponse, error) {
	logger.Debug("Exec: %+v", req)
	return s.runtimeClient.Exec(ctx, req)
}

func (s *v1RuntimeService) Attach(ctx context.Context, req *api.AttachRequest) (*api.AttachResponse, error) {
	logger.Debug("Attach: %+v", req)
	return s.runtimeClient.Attach(ctx, req)
}

func (s *v1RuntimeService) PortForward(ctx context.Context, req *api.PortForwardRequest) (*api.PortForwardResponse, error) {
	logger.Debug("PortForward: %+v", req)
	return s.runtimeClient.PortForward(ctx, req)
}

func (s *v1RuntimeService) ContainerStats(ctx context.Context, req *api.ContainerStatsRequest) (*api.ContainerStatsResponse, error) {
	logger.Debug("ContainerStats: %+v", req)
	return s.runtimeClient.ContainerStats(ctx, req)
}

func (s *v1RuntimeService) ListContainerStats(ctx context.Context, req *api.ListContainerStatsRequest) (*api.ListContainerStatsResponse, error) {
	logger.Debug("ListContainerStats: %+v", req)
	return s.runtimeClient.ListContainerStats(ctx, req)
}

func (s *v1RuntimeService) PodSandboxStats(ctx context.Context, req *api.PodSandboxStatsRequest) (*api.PodSandboxStatsResponse, error) {
	logger.Debug("PodSandboxStats: %+v", req)
	return s.runtimeClient.PodSandboxStats(ctx, req)
}

func (s *v1RuntimeService) ListPodSandboxStats(ctx context.Context, req *api.ListPodSandboxStatsRequest) (*api.ListPodSandboxStatsResponse, error) {
	logger.Debug("ListPodSandboxStats: %+v", req)
	return s.runtimeClient.ListPodSandboxStats(ctx, req)
}

func (s *v1RuntimeService) UpdateRuntimeConfig(ctx context.Context, req *api.UpdateRuntimeConfigRequest) (*api.UpdateRuntimeConfigResponse, error) {
	logger.Debug("UpdateRuntimeConfig: %+v", req)
	return s.runtimeClient.UpdateRuntimeConfig(ctx, req)
}

func (s *v1RuntimeService) Status(ctx context.Context, req *api.StatusRequest) (*api.StatusResponse, error) {
	logger.Debug("Status: %+v", req)
	return s.runtimeClient.Status(ctx, req)
}

func (s *v1RuntimeService) CheckpointContainer(ctx context.Context, req *api.CheckpointContainerRequest) (*api.CheckpointContainerResponse, error) {
	logger.Debug("CheckpointContainer: %+v", req)
	return s.runtimeClient.CheckpointContainer(ctx, req)
}

func (s *v1RuntimeService) GetContainerEvents(req *api.GetEventsRequest, stream api.RuntimeService_GetContainerEventsServer) error {
	logger.Debug("GetContainerEvents: %+v", req)
	return fmt.Errorf("GetContainerEvents not implemented")
}

func (s *v1RuntimeService) ListMetricDescriptors(ctx context.Context, req *api.ListMetricDescriptorsRequest) (*api.ListMetricDescriptorsResponse, error) {
	logger.Debug("ListMetricDescriptors: %+v", req)
	return s.runtimeClient.ListMetricDescriptors(ctx, req)
}

func (s *v1RuntimeService) ListPodSandboxMetrics(ctx context.Context, req *api.ListPodSandboxMetricsRequest) (*api.ListPodSandboxMetricsResponse, error) {
	logger.Debug("ListPodSandboxMetrics: %+v", req)
	return s.runtimeClient.ListPodSandboxMetrics(ctx, req)
}
