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

package registry

import (
	"strings"

	"github.com/labring/sealos/pkg/utils/registry"
)

func (is *DefaultImage) RmiImage(registryName, imageName string) error {
	authInfo := is.auths[registryName]
	reg, err := registry.NewRegistryForDomain(registryName, authInfo.Username, authInfo.Password)
	if err != nil {
		return err
	}
	imageAndTag := strings.Split(imageName, ":")
	tag := ""
	if len(imageAndTag) == 1 {
		tag = "latest"
	} else {
		tag = imageAndTag[1]
	}
	digest, err := reg.ManifestDigest(imageAndTag[0], tag)
	if err != nil {
		return err
	}
	return reg.DeleteManifest(imageAndTag[0], digest)
}
