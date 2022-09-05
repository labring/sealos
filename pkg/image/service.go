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

package image

import (
	buildah_cluster "github.com/labring/sealos/pkg/image/buildah/cluster"
	buildah_image "github.com/labring/sealos/pkg/image/buildah/image"
	"github.com/labring/sealos/pkg/image/buildah/registry"
	"github.com/labring/sealos/pkg/image/types"
)

func NewClusterService() (types.ClusterService, error) {
	err := initBuildah()
	if err == nil {
		return buildah_cluster.NewClusterService()
	}
	return nil, err
}

func NewRegistryService() (types.RegistryService, error) {
	err := initBuildah()
	if err == nil {
		return registry.NewRegistryService()
	}
	return nil, err
}

func NewImageService() (types.ImageService, error) {
	err := initBuildah()
	if err == nil {
		return buildah_image.NewImageService()
	}
	return nil, err
}
