// Copyright © 2021 Alibaba Group Holding Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package bootstrap

import (
	"fmt"
	"path"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

func GetRegistryInfo(sshInterface ssh.Interface, rootfs, defaultRegistry string) *v1beta1.RegistryConfig {
	const registryCustomConfig = "registry.yml"
	var DefaultConfig = &v1beta1.RegistryConfig{
		IP:       iputils.GetHostIP(defaultRegistry),
		Domain:   constants.DefaultRegistryDomain,
		Port:     "5000",
		Username: constants.DefaultRegistryUsername,
		Password: constants.DefaultRegistryPassword,
		Data:     constants.DefaultRegistryData,
	}
	etcPath := path.Join(rootfs, constants.EtcDirName, registryCustomConfig)
	out, _ := sshInterface.Cmd(defaultRegistry, fmt.Sprintf("cat %s", etcPath))
	logger.Debug("image shim data info: %s", string(out))
	registryConfig, err := yaml.UnmarshalData(out)
	if err != nil {
		logger.Warn("read registry config path error: %+v", err)
		logger.Info("use default registry config")
		return DefaultConfig
	}
	domain, _, _ := unstructured.NestedString(registryConfig, "domain")
	port, _, _ := unstructured.NestedString(registryConfig, "port")
	username, _, _ := unstructured.NestedString(registryConfig, "username")
	password, _, _ := unstructured.NestedString(registryConfig, "password")
	data, _, _ := unstructured.NestedString(registryConfig, "data")
	ip, _, _ := unstructured.NestedString(registryConfig, "ip")

	if ip == "" {
		ip = defaultRegistry
	}
	if domain == "" {
		domain = DefaultConfig.Domain
	}
	if port == "" {
		port = DefaultConfig.Port
	}
	rConfig := &v1beta1.RegistryConfig{
		IP:       ip,
		Domain:   domain,
		Port:     port,
		Username: username,
		Password: password,
		Data:     data,
	}
	logger.Debug("show registry info, IP: %s, Domain: %s, Data: %s", rConfig.IP, rConfig.Domain, rConfig.Data)
	return rConfig
}
