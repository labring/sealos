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
	"github.com/modood/table"
	"github.com/opencontainers/go-digest"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/registry"
)

func (is *DefaultImage) ListImages(registryName string, search string) {
	authInfo := is.auths[registryName]
	var listImage []imageOutputParams
	reg, err := registry.NewRegistryForDomain(registryName, authInfo.Username, authInfo.Password)
	if err != nil {
		logger.Error("Failed to list image : %v", err)
		return
	}
	repos, _ := reg.Repositories()
	for _, repo := range repos {
		tags, _ := reg.Tags(repo)
		for _, tag := range tags {
			var imageID digest.Digest
			imageID, _ = reg.ManifestDigest(repo, tag)
			listImage = append(listImage, imageOutputParams{
				RegistryName: registryName,
				Repository:   repo,
				Tag:          tag,
				ImageID:      imageID.String(),
			})
		}
	}
	table.OutputA(listImage)
	logger.Info("Images count %d", len(listImage))
}

func (is *DefaultImage) ListRegistry() {
	var listRegistry []registryOutputParams
	for domain, auth := range is.auths {
		reg, err := registry.NewRegistryForDomain(domain, auth.Username, auth.Password)
		if err != nil {
			listRegistry = append(listRegistry, registryOutputParams{
				Name:     domain,
				URL:      "unknow://" + domain,
				UserName: auth.Username,
				Password: auth.Password,
				Healthy:  "failed",
			})
		} else {
			listRegistry = append(listRegistry, registryOutputParams{
				Name:     domain,
				URL:      reg.URL,
				UserName: auth.Username,
				Password: auth.Password,
				Healthy:  "ok",
			})
		}
	}
	table.OutputA(listRegistry)
}

type registryOutputParams struct {
	Name     string
	URL      string
	UserName string
	Password string
	Healthy  string
}

type imageOutputParams struct {
	RegistryName string
	Repository   string
	Tag          string
	ImageID      string
}
