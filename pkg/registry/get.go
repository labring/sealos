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
	"encoding/json"
	"fmt"
	"strings"

	"github.com/modood/table"
	"github.com/opencontainers/go-digest"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/registry"
)

func (is *DefaultImage) GetImage(registryName, name string, enableJSON bool) {
	authInfo := is.auths[registryName]
	reg, err := registry.NewRegistryForDomain(registryName, authInfo.Username, authInfo.Password)
	if err != nil {
		logger.Error("Failed to list image : %v", err)
		return
	}
	repoAndTag := strings.Split(name, ":")
	var repo, tag string
	if len(repoAndTag) == 2 {
		repo = repoAndTag[0]
		tag = repoAndTag[1]
	} else {
		repo = repoAndTag[0]
		tag = "latest"
	}
	var imageDigest digest.Digest
	var imageID digest.Digest
	var image imageOutputParams
	imageDigestStr, imageIDStr, imageIDShortStr := none, none, none
	imageDigest, _ = reg.ManifestDigest(repo, tag)
	manifest, _ := reg.ManifestV2(repo, tag)
	if imageDigest != "" {
		imageDigestStr = imageDigest.String()
	}
	if manifest != nil {
		imageID = manifest.Config.Digest
		imageIDStr = imageID.Hex()
		imageIDShortStr = imageIDStr[:12]
	}

	image = imageOutputParams{
		RegistryName: registryName,
		ImageName:    repo,
		Tag:          tag,
		ImageID:      imageIDStr,
		ImageIDShort: imageIDShortStr,
		ImageDigest:  imageDigestStr,
	}

	if enableJSON {
		marshalled, err := json.Marshal(image)
		if err != nil {
			logger.Error("Failed to Marshal Json : %v", err)
			return
		}
		fmt.Println(string(marshalled))
		return
	}
	table.OutputA([]imageOutputParams{image})
}
