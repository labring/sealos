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
	"github.com/labring/sealos/pkg/registry"

	"github.com/docker/docker/api/types"

	"github.com/labring/sealos/pkg/utils/exec"
	img "github.com/labring/sealos/pkg/utils/images"
	"github.com/labring/sealos/pkg/utils/logger"
)

// replaceImage replaces the image name to a new valid image name with the private registry.
func replaceImage(image, action string, authConfig map[string]types.AuthConfig) (newImage string, isReplace bool, cfg *types.AuthConfig) {
	// TODO we can change the image name of req, and make the cri pull the image we need.
	// for example:
	// req.Image.Image = "sealos.hub:5000/library/nginx:1.1.1"
	// and the cri will pull "sealos.hub:5000/library/nginx:1.1.1", and save it as "sealos.hub:5000/library/nginx:1.1.1"
	// note:
	// but kubelet sometimes will invoke imageService.RemoveImage() or something else. The req.Image.Image will the original name.
	// so we'd better tag "sealos.hub:5000/library/nginx:1.1.1" with original name "req.Image.Image" After "rsp, err := (*s.imageService).PullImage(ctx, req)".
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
	newImage, _, cfg, err = registry.GetImageManifestFromAuth(image, authConfig)
	if err != nil {
		logger.Warn("get image %s manifest error %s", newImage, err.Error())
		logger.Debug("image %s not found in registry, skipping", image)
		return image, false, nil
	}
	logger.Info("image: %s, newImage: %s, action: %s", image, newImage, action)
	return newImage, true, cfg
}
