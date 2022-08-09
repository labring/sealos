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

	img "github.com/labring/sealos/pkg/utils/images"
	str "github.com/labring/sealos/pkg/utils/strings"

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
	images, err := img.RunBashCmd("crictl images -q")
	if err != nil {
		logger.Warn("error executing `crictl images -q`: %s", err.Error())
		return
	}
	if img.IsImageID(images, image) {
		logger.Info("image %s already exist, skipping", image)
		return
	}

	domain, imageName := splitDockerDomain(image)
	logger.Info("domain: %s, imageName: %s, action: %s", domain, imageName, action)
	name, tag := parseImageNameAndTag(imageName)
	tag = stripTagDigest(tag)
	newImageName := name + ":" + tag

	// there's no list of image-shims, or image is not found on the list
	if len(ShimImages) == 0 || (len(ShimImages) != 0 && !str.In(image, ShimImages)) {
		if img.RegistryHasImage(SealosHub, Base64Auth, name, tag) {
			newImage = prependRegistry(newImageName)
		} else {
			logger.Info("image %s not found in registry, skipping", newImageName)
			newImage = joinDockerDomain(domain, newImageName)
		}
	} else if SealosHub != "" && domain != "" {
		// image found on the list, and there is a private registry and a domain in the original image
		newImage = prependRegistry(newImageName)
	}

	logger.Info("begin image: %s, after image: %s, action: %s", image, newImage, action)
	return
}

// parseImageNameAndTag splits the input image name into its name and tag.
func parseImageNameAndTag(imageName string) (name, tag string) {
	imageSplitted := strings.Split(imageName, ":")
	name, tag = imageSplitted[0], "latest"
	if len(imageSplitted) > 1 {
		tag = imageSplitted[1]
	}

	return
}

// stripTagDigest strips the digest from the tag, and returns the stripped tag.
func stripTagDigest(tag string) string {
	tagSplitted := strings.Split(tag, "@")
	if len(tagSplitted) > 1 {
		logger.Info("stripped digest in tag: %s", tagSplitted[1])
	}
	return tagSplitted[0]
}

// prependRegistry prepends the private registry to the imageName.
func prependRegistry(imageName string) string {
	return getRegistryDomain() + "/" + imageName
}

// splitDockerDomain splits image into domain and remainder as well as normalizes them.
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

// joinDockerDomain joins the domain and the remainder, which is sort of the inverse of splitDockerDomain.
func joinDockerDomain(domain, remainder string) string {
	if domain == "" {
		return remainder
	}
	return domain + "/" + remainder
}
