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

	"github.com/labring/sealos/fork/github.com/heroku/docker-registry-client/registry"
	"github.com/labring/sealos/pkg/utils/logger"
)

func NewRegistry(url, username, password string, skipTLS bool) (*registry.Registry, error) {
	var hub *registry.Registry
	var err error
	var log = func(format string, args ...interface{}) {
		logger.Debug(format, args...)
	}
	if skipTLS {
		hub, err = registry.NewInsecure(url, username, password, log)
	} else {
		hub, err = registry.New(url, username, password, log)
	}
	if err != nil {
		return nil, err
	}
	return hub, nil
}

func NewRegistryForDomain(domain, username, password string) (*registry.Registry, error) {
	url := "https://" + domain
	reg, err := NewRegistry(url, username, password, false)
	if err == nil {
		return reg, nil
	}
	url = "http://" + domain
	reg, err = NewRegistry(url, username, password, true)
	if err == nil {
		return reg, nil
	}
	return nil, fmt.Errorf("not found registry in this domain: %s", domain)
}
