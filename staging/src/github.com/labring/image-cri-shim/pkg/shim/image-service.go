// Copyright 2019 Intel Corporation. All Rights Reserved.
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

package shim

import (
	"context"

	api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
)

func (r *shim) ListImages(ctx context.Context,
	req *api.ListImagesRequest) (*api.ListImagesResponse, error) {
	return r.client.ListImages(ctx, req)
}

func (r *shim) ImageStatus(ctx context.Context,
	req *api.ImageStatusRequest) (*api.ImageStatusResponse, error) {
	return r.client.ImageStatus(ctx, req)
}

func (r *shim) PullImage(ctx context.Context,
	req *api.PullImageRequest) (*api.PullImageResponse, error) {
	return r.client.PullImage(ctx, req)
}

func (r *shim) RemoveImage(ctx context.Context,
	req *api.RemoveImageRequest) (*api.RemoveImageResponse, error) {
	return r.client.RemoveImage(ctx, req)
}

func (r *shim) ImageFsInfo(ctx context.Context,
	req *api.ImageFsInfoRequest) (*api.ImageFsInfoResponse, error) {
	return r.client.ImageFsInfo(ctx, req)
}
