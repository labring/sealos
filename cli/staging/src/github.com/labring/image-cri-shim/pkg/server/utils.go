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
	"github.com/labring/sreg/pkg/registry/crane"

	"github.com/docker/docker/api/types"

	"github.com/labring/sealos/pkg/utils/logger"
)

// ListImages gets all images currently on the machine.
//func (m *kubeGenericRuntimeManager) ListImages() ([]kubecontainer.Image, error) {
//	var images []kubecontainer.Image
//
//	allImages, err := m.imageService.ListImages(nil)
//	if err != nil {
//		klog.ErrorS(err, "Failed to list images")
//		return nil, err
//	}
//
//	for _, img := range allImages {
//		images = append(images, kubecontainer.Image{
//			ID:          img.Id,
//			Size:        int64(img.Size_),
//			RepoTags:    img.RepoTags,
//			RepoDigests: img.RepoDigests,
//			Spec:        toKubeContainerImageSpec(img),
//		})
//	}
//
//	return images, nil
//}
//for _, image := range images {
//		klog.V(5).InfoS("Adding image ID to currentImages", "imageID", image.ID)
//		currentImages.Insert(image.ID)
//
//		// New image, set it as detected now.
//		if _, ok := im.imageRecords[image.ID]; !ok {
//			klog.V(5).InfoS("Image ID is new", "imageID", image.ID)
//			im.imageRecords[image.ID] = &imageRecord{
//				firstDetected: detectTime,
//			}
//		}
//
//		// Set last used time to now if the image is being used.
//		if isImageUsed(image.ID, imagesInUse) {
//			klog.V(5).InfoS("Setting Image ID lastUsed", "imageID", image.ID, "lastUsed", now)
//			im.imageRecords[image.ID].lastUsed = now
//		}
//
//		klog.V(5).InfoS("Image ID has size", "imageID", image.ID, "size", image.Size)
//		im.imageRecords[image.ID].size = image.Size
//
//		klog.V(5).InfoS("Image ID is pinned", "imageID", image.ID, "pinned", image.Pinned)
//		im.imageRecords[image.ID].pinned = image.Pinned
//	}

// replaceImage replaces the image name to a new valid image name with the private registry.
func replaceImage(image, action string, authConfig map[string]types.AuthConfig) (newImage string, isReplace bool, cfg *types.AuthConfig) {
	// TODO we can change the image name of req, and make the cri pull the image we need.
	// for example:
	// req.Image.Image = "sealos.hub:5000/library/nginx:1.1.1"
	// and the cri will pull "sealos.hub:5000/library/nginx:1.1.1", and save it as "sealos.hub:5000/library/nginx:1.1.1"
	// note:
	// but kubelet sometimes will invoke imageService.RemoveImage() or something else. The req.Image.Image will the original name.
	// so we'd better tag "sealos.hub:5000/library/nginx:1.1.1" with original name "req.Image.Image" After "rsp, err := (*s.imageService).PullImage(ctx, req)".
	//for image id] this is mistake, we should replace the image name, not the image id.
	newImage, _, cfg, err := crane.GetImageManifestFromAuth(image, authConfig)
	if err != nil {
		logger.Warn("get image %s manifest error %s", newImage, err.Error())
		logger.Debug("image %s not found in registry, skipping", image)
		return image, false, nil
	}
	logger.Info("image: %s, newImage: %s, action: %s", image, newImage, action)
	return newImage, true, cfg
}
