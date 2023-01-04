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
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/registry"
)

func (is *DefaultImage) Status(enableJSON bool) {
	var listRegistry []registryOutputParams
	if len(is.auths) == 0 && !enableJSON {
		logger.Warn("your registry not login")
	}
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
	if enableJSON {
		marshalled, err := json.Marshal(listRegistry)
		if err != nil {
			logger.Error("Failed to Marshal Json : %v", err)
			return
		}
		fmt.Println(string(marshalled))
		return
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
