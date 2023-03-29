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

package types

import (
	"github.com/docker/docker/api/types"
	apiv1 "k8s.io/cri-api/pkg/apis/runtime/v1"
	apiv1alpha2 "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
)

func ToV1AuthConfig(c *types.AuthConfig) *apiv1.AuthConfig {
	return &apiv1.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}

func ToV1Alpha2AuthConfig(c *types.AuthConfig) *apiv1alpha2.AuthConfig {
	return &apiv1alpha2.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}
