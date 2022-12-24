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
	apiv1 "k8s.io/cri-api/pkg/apis/runtime/v1"
	apiv1alpha2 "k8s.io/cri-api/pkg/apis/runtime/v1alpha2"
)

// AuthConfig contains authorization information for connecting to a registry.
type AuthConfig struct {
	Username      string `protobuf:"bytes,1,opt,name=username,proto3" json:"username,omitempty"`
	Password      string `protobuf:"bytes,2,opt,name=password,proto3" json:"password,omitempty"`
	Auth          string `protobuf:"bytes,3,opt,name=auth,proto3" json:"auth,omitempty"`
	ServerAddress string `protobuf:"bytes,4,opt,name=server_address,json=serverAddress,proto3" json:"server_address,omitempty"`
	// IdentityToken is used to authenticate the user and get
	// an access token for the registry.
	IdentityToken string `protobuf:"bytes,5,opt,name=identity_token,json=identityToken,proto3" json:"identity_token,omitempty"`
	// RegistryToken is a bearer token to be sent to a registry
	RegistryToken string `protobuf:"bytes,6,opt,name=registry_token,json=registryToken,proto3" json:"registry_token,omitempty"`
}

func (c *AuthConfig) ToV1AuthConfig() *apiv1.AuthConfig {
	return &apiv1.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}

func (c *AuthConfig) ToV1Alpha2AuthConfig() *apiv1alpha2.AuthConfig {
	return &apiv1alpha2.AuthConfig{
		Username:      c.Username,
		Password:      c.Password,
		Auth:          c.Auth,
		ServerAddress: c.ServerAddress,
		IdentityToken: c.IdentityToken,
		RegistryToken: c.RegistryToken,
	}
}
