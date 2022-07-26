// Copyright © 2022 sealos.
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

package server

import (
	"context"
	"strings"

	"github.com/labring/image-cri-shim/pkg/utils"
	"github.com/labring/sealos/pkg/utils/logger"
	api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
)

const (
	legacyDefaultDomain = "index.docker.io"
	defaultDomain       = "docker.io"
	officialRepoName    = "library"
)

func (s *server) ListImages(ctx context.Context,
	req *api.ListImagesRequest) (*api.ListImagesResponse, error) {
	rsp, err := (*s.imageService).ListImages(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) ImageStatus(ctx context.Context,
	req *api.ImageStatusRequest) (*api.ImageStatusResponse, error) {
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "ImageStatus")
	}
	rsp, err := (*s.imageService).ImageStatus(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) PullImage(ctx context.Context,
	req *api.PullImageRequest) (*api.PullImageResponse, error) {
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "PullImage")
	}
	rsp, err := (*s.imageService).PullImage(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) RemoveImage(ctx context.Context,
	req *api.RemoveImageRequest) (*api.RemoveImageResponse, error) {
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "RemoveImage")
	}
	rsp, err := (*s.imageService).RemoveImage(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) ImageFsInfo(ctx context.Context,
	req *api.ImageFsInfoRequest) (*api.ImageFsInfoResponse, error) {
	rsp, err := (*s.imageService).ImageFsInfo(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}
func (s *server) replaceImage(image, action string) string {
	// TODO we can change the image name of req, and make the cri pull the image we need.
	// for example:
	// req.Image.Image = "sealer.hub/library/nginx:1.1.1"
	// and the cri will pull "sealer.hub/library/nginx:1.1.1", and save it as "sealer.hub/library/nginx:1.1.1"
	// note:
	// but kubelet sometimes will invoke imageService.RemoveImage() or something else. The req.Image.Image will the original name.
	// so we'd better tag "sealer.hub/library/nginx:1.1.1" with original name "req.Image.Image" After "rsp, err := (*s.imageService).PullImage(ctx, req)".
	//for image id
	images, err := utils.RunBashCmd("crictl images -q")
	if err != nil {
		logger.Warn("exec crictl images -q error: %s", err.Error())
		return image
	}
	if utils.IsImageID(images, image) {
		logger.Info("image: %s is imageID,skip replace", image)
		return image
	}
	//for image name
	domain, named := splitDockerDomain(image)
	logger.Info("domain: %s,named: %s,action: %s", domain, named, action)
	if len(ShimImages) == 0 || (len(ShimImages) != 0 && utils.NotIn(image, ShimImages)) {
		if utils.RegistryHasImage(SealosHub, Base64Auth, named) {
			newImage := getRegistrDomain() + "/" + named
			logger.Info("begin image: %s ,after image: %s", image, newImage)
			return newImage
		}
		logger.Info("skip replace images %s", image)
		return image
	}

	fixImageName := image
	if SealosHub != "" {
		if domain != "" {
			fixImageName = getRegistrDomain() + "/" + named
		}
	}

	if Debug {
		logger.Info("begin image: %s ,after image: %s , action: %s", image, fixImageName, action)
	}
	return fixImageName
}
func splitDockerDomain(name string) (domain, remainder string) {
	i := strings.IndexRune(name, '/')
	if i == -1 || (!strings.ContainsAny(name[:i], ".:") && strings.ToLower(name[:i]) == name[:i]) {
		domain, remainder = "", name
	} else {
		domain, remainder = name[:i], name[i+1:]
	}
	if domain == legacyDefaultDomain || domain == "" {
		domain = defaultDomain
	}
	if domain == defaultDomain && !strings.ContainsRune(remainder, '/') {
		remainder = officialRepoName + "/" + remainder
	}
	return
}
