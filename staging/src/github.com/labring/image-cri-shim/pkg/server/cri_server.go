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

	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/registry"

	api "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"

	img "github.com/labring/sealos/pkg/utils/images"
	"github.com/labring/sealos/pkg/utils/logger"
	str "github.com/labring/sealos/pkg/utils/strings"
)

func (s *server) ListImages(ctx context.Context,
	req *api.ListImagesRequest) (*api.ListImagesResponse, error) {
	logger.Debug("ListImages: %+v", req)
	rsp, err := s.imageClient.ListImages(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) ImageStatus(ctx context.Context,
	req *api.ImageStatusRequest) (*api.ImageStatusResponse, error) {
	logger.Debug("ImageStatus: %+v", req)
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "ImageStatus")
	}
	rsp, err := s.imageClient.ImageStatus(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) PullImage(ctx context.Context,
	req *api.PullImageRequest) (*api.PullImageResponse, error) {
	logger.Debug("PullImage begin: %+v", req)
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "PullImage")
	}
	replacedImageDomain, _ := parseImageDomainAndName(req.Image.Image)
	if req.Auth == nil {
		if criAuth, ok := s.options.CRIConfigs[replacedImageDomain]; ok {
			req.Auth = &criAuth
		}
	}

	logger.Debug("PullImage after: %+v", req)
	rsp, err := s.imageClient.PullImage(ctx, req)
	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) RemoveImage(ctx context.Context,
	req *api.RemoveImageRequest) (*api.RemoveImageResponse, error) {
	logger.Debug("RemoveImage: %+v", req)
	if req.Image != nil {
		req.Image.Image = s.replaceImage(req.Image.Image, "RemoveImage")
	}
	rsp, err := s.imageClient.RemoveImage(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

func (s *server) ImageFsInfo(ctx context.Context,
	req *api.ImageFsInfoRequest) (*api.ImageFsInfoResponse, error) {
	logger.Debug("ImageFsInfo: %+v", req)
	rsp, err := s.imageClient.ImageFsInfo(ctx, req)

	if err != nil {
		return nil, err
	}

	return rsp, err
}

// replaceImage replaces the image name to a new valid image name with the private registry.
func (s *server) replaceImage(image, action string) (newImage string) {
	// TODO we can change the image name of req, and make the cri pull the image we need.
	// for example:
	// req.Image.Image = "sealer.hub/library/nginx:1.1.1"
	// and the cri will pull "sealer.hub/library/nginx:1.1.1", and save it as "sealer.hub/library/nginx:1.1.1"
	// note:
	// but kubelet sometimes will invoke imageService.RemoveImage() or something else. The req.Image.Image will the original name.
	// so we'd better tag "sealer.hub/library/nginx:1.1.1" with original name "req.Image.Image" After "rsp, err := (*s.imageService).PullImage(ctx, req)".
	//for image id]
	newImage = image
	images, err := exec.RunBashCmd("crictl images -q")
	if err != nil {
		logger.Warn("error executing `crictl images -q`: %s", err.Error())
		return
	}
	if img.IsImageID(images, image) {
		logger.Info("image %s already exist, skipping", image)
		return
	}

	preDomain, preImageAllName := parseImageDomainAndName(image)
	logger.Debug("preDomain: %s, preImageAllName: %s, action: %s", preDomain, preImageAllName, action)
	preImageName, preImageTag := parseImageNameAndTag(preImageAllName)
	logger.Debug("preImageName: %s, preImageTag: %s, action: %s", preImageName, preImageTag, action)
	for authDomain, auth := range s.options.CRIConfigs {
		if reg, err := registry.NewRegistryForDomain(authDomain, auth.Username, auth.Password); err == nil {
			if tags, err := reg.Tags(preImageName); err != nil {
				logger.Warn("list tag for %s error: %+v", preImageName, err)
			} else if str.InList(preImageTag, tags) {
				newImage = joinImageDomainAndName(authDomain, strings.Join([]string{preImageName, preImageTag}, ":"))
				logger.Info("image: %s, newImage: %s, action: %s", image, newImage, action)
				return
			}
		}
		newImage = image
		logger.Debug("image %s not found in registry, skipping", image)
		logger.Info("image: %s, newImage: %s, action: %s", image, newImage, action)
	}
	return
}

// parseImageNameAndTag splits the input image name into its name and tag.
func parseImageNameAndTag(imageName string) (name, tag string) {
	imageSplitted := strings.Split(imageName, ":")
	name, tag = imageSplitted[0], "latest"
	if len(imageSplitted) > 1 {
		tag = imageSplitted[1]
	}

	nameSplitted := strings.Split(name, "@")
	if len(nameSplitted) > 1 {
		name = nameSplitted[0]
		tag = "latest"
		logger.Debug("stripped digest in name: %s", nameSplitted[1])
	}
	logger.Info("actual imageName: %s:%s", name, tag)
	return
}

// parseImageDomainAndName splits image into domain and remainder as well as normalizes them.
func parseImageDomainAndName(name string) (domain, remainder string) {
	const (
		legacyDefaultDomain = "index.docker.io"
		defaultDockerDomain = "docker.io"
		officialRepoName    = "library"
	)
	i := strings.IndexRune(name, '/')
	if i == -1 || (!strings.ContainsAny(name[:i], ".:") && strings.ToLower(name[:i]) == name[:i]) {
		domain, remainder = "", name
	} else {
		domain, remainder = name[:i], name[i+1:]
	}
	if domain == legacyDefaultDomain || domain == "" {
		domain = defaultDockerDomain
	}
	if domain == defaultDockerDomain && !strings.ContainsRune(remainder, '/') {
		remainder = officialRepoName + "/" + remainder
	}
	return
}

// joinImageDomainAndName joins the domain and the remainder, which is sort of the inverse of parseImageDomainAndName.
func joinImageDomainAndName(domain, remainder string) string {
	if domain == "" {
		return remainder
	}
	return strings.Join([]string{domain, remainder}, "/")
}
