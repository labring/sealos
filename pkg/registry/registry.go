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
	"context"
	"fmt"

	types2 "github.com/containers/image/v5/types"
	"github.com/docker/docker/api/types"
	"github.com/google/go-containerregistry/pkg/name"
	"github.com/google/go-containerregistry/pkg/v1/remote/transport"

	"github.com/labring/sealos/pkg/registry/authn"
	"github.com/labring/sealos/pkg/utils/http"
)

func NewRegistry(domain string, authConfig types.AuthConfig) (name.Registry, error) {
	domain = GetRegistryDomain(domain)
	domain = NormalizeRegistry(domain)
	ping := func(v name.Registry) error {
		au, _ := authn.NewDefaultKeychain(map[string]types.AuthConfig{domain: authConfig}).Resolve(v)
		_, err := transport.NewWithContext(context.Background(), v, au, http.DefaultSkipVerify, nil)
		return err
	}

	var hub name.Registry
	var hubList []name.Registry
	var err error

	hub, err = name.NewRegistry(domain)
	if err != nil {
		return name.Registry{}, err
	}
	hubList = append(hubList, hub)

	hub, err = name.NewRegistry(domain, name.Insecure)
	if err != nil {
		return name.Registry{}, err
	}
	hubList = append(hubList, hub)
	for i := range hubList {
		if err = ping(hubList[i]); err == nil {
			return hubList[i], nil
		}
	}
	return name.Registry{}, fmt.Errorf("not found registry: %+v", err)
}

func ToAuthConfig(cfg types2.DockerAuthConfig) types.AuthConfig {
	return types.AuthConfig{
		Username:      cfg.Username,
		Password:      cfg.Password,
		IdentityToken: cfg.IdentityToken,
	}
}
