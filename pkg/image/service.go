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
	"errors"

	"github.com/labring/sealos/pkg/image/binary"
	buildah_image "github.com/labring/sealos/pkg/image/buildah/image"
	"github.com/labring/sealos/pkg/image/buildah/registry"
	"github.com/labring/sealos/pkg/image/types"
)

func NewClusterService() (types.ClusterService, error) {
	if ok, err := initBuildah(); err == nil && ok {
		return binary.NewClusterService()
	}
	return nil, errors.New("buildah not found in system path")
}

func NewRegistryService() (types.RegistryService, error) {
	if ok, err := initBuildah(); err == nil && ok {
		return binary.NewRegistryService()
	}
	return registry.NewRegistryService()
}

func NewImageService() (types.Service, error) {
	if ok, err := initBuildah(); err == nil && ok {
		return binary.NewImageService()
	}
	return buildah_image.NewImageService()
}
