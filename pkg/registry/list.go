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
	"fmt"

	"github.com/modood/table"
	"github.com/opencontainers/go-digest"
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/registry"
)

func (is *DefaultImage) ListImages(registryName, search string, enableJSON bool) {
	logger.Debug("param registryName: %s, filter: %s", registryName, search)
	authInfo := is.auths[registryName]
	var listImage []imageOutputParams
	reg, err := registry.NewRegistryForDomain(registryName, authInfo.Username, authInfo.Password)
	if err != nil {
		logger.Error("Failed to list image : %v", err)
		return
	}
	filter := newFilter(search)
	if err = filter.Validate(); err != nil {
		logger.Error("Failed to list image using filter : %v", err)
		return
	}

	logger.Debug("filter name=%s,strategy=%s", filter.Name, filter.nameStrategy)
	logger.Debug("filter tag=%s,strategy=%s", filter.Tag, filter.tagStrategy)

	var repos []string
	if filter.nameStrategy == FilterStrategyEquals {
		repos = []string{filter.Name}
	} else {
		repos, err = reg.Repositories(func(data []string) []string {
			return filter.Run(data, FilterTypeName)
		})
		if err != nil {
			logger.Error("list image is error: %+v", err)
			return
		}
	}

	var imageVersionList bool
	defer func() {
		if !enableJSON {
			logger.Info("Image count %d", len(repos))
			if imageVersionList {
				logger.Info("Images Version count %d", len(listImage))
			}
		}
	}()
	for _, repo := range repos {
		tags, _ := reg.Tags(repo)
		tags = filter.Run(tags, FilterTypeTag)
		if len(tags) == 0 {
			listImage = append(listImage, imageOutputParams{
				RegistryName: registryName,
				ImageName:    repo,
				Tag:          "<none>",
				ImageID:      "<none>",
			})
		} else {
			imageVersionList = true
			for _, tag := range tags {
				var imageID digest.Digest
				imageID, _ = reg.ManifestDigest(repo, tag)
				listImage = append(listImage, imageOutputParams{
					RegistryName: registryName,
					ImageName:    repo,
					Tag:          tag,
					ImageID:      imageID.String(),
				})
			}
		}
	}
	if enableJSON {
		marshalled, err := json.Marshal(listImage)
		if err != nil {
			logger.Error("Failed to Marshal Json : %v", err)
			return
		}
		fmt.Println(string(marshalled))
		return
	}
	table.OutputA(listImage)
}

type imageOutputParams struct {
	RegistryName string
	ImageName    string
	Tag          string
	ImageID      string
}
