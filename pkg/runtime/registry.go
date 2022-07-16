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

package runtime

import (
	"fmt"
	"path"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/passwd"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func (k *KubeadmRuntime) GetRegistryInfo(rootfs, defaultRegistry string) *v1beta1.RegistryConfig {
	const registryCustomConfig = "registry.yml"
	var DefaultConfig = &v1beta1.RegistryConfig{
		IP:       defaultRegistry,
		Domain:   constants.DefaultRegistryDomain,
		Port:     "5000",
		Username: constants.DefaultRegistryUsername,
		Password: constants.DefaultRegistryPassword,
		Data:     constants.DefaultRegistryData,
	}
	etcPath := path.Join(rootfs, constants.EtcDirName, registryCustomConfig)
	out, _ := k.getSSHInterface().Cmd(defaultRegistry, fmt.Sprintf("cat %s", etcPath))
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

func (k *KubeadmRuntime) htpasswd(registry *v1beta1.RegistryConfig) error {
	htpasswdEtcPath := path.Join(k.getContentData().EtcPath(), "registry_htpasswd")
	if registry.Username == "" && registry.Password == "" {
		logger.Warn("registry username and password is empty")
		return nil
	}
	logger.Debug("get htpasswd  data: username %s, password %s", registry.Username, registry.Password)
	data := passwd.Htpasswd(registry.Username, registry.Password)
	logger.Debug("write htpasswd etc file: %s,data: %s", htpasswdEtcPath, data)
	if err := file.WriteFile(htpasswdEtcPath, []byte(data)); err != nil {
		return errors.Wrap(err, "write registry htpasswd error")
	}
	htpasswdDetEtcPath := path.Join(k.getContentData().RootFSEtcPath(), "registry_htpasswd")
	return k.sshCopy(registry.IP, htpasswdEtcPath, htpasswdDetEtcPath)
}

func (k *KubeadmRuntime) ApplyRegistry() error {
	logger.Info("start to apply registry")
	registry := k.getRegistry()
	lnCmd := fmt.Sprintf(constants.DefaultLnFmt, k.getContentData().RootFSRegistryPath(), registry.Data)
	logger.Debug("apply registry ln cmd: %s", lnCmd)
	err := k.sshCmdAsync(registry.IP, lnCmd)
	if err != nil {
		return fmt.Errorf("copy registry data failed %v", err)
	}
	err = k.htpasswd(registry)
	if err != nil {
		return fmt.Errorf("generator registry htpasswd failed %v", err)
	}
	err = k.execInitRegistry(registry.IP)
	if err != nil {
		return fmt.Errorf("exec registry.sh failed %v", err)
	}

	return nil
}

func (k *KubeadmRuntime) DeleteRegistry() error {
	logger.Info("delete registry in master0...")
	ip := k.getMaster0IPAndPort()
	if err := k.execCleanRegistry(ip); err != nil {
		return fmt.Errorf("exec clean-registry.sh failed %v", err)
	}
	return nil
}

func (k *KubeadmRuntime) registryAuth(ip string) error {
	logger.Info("registry auth in node %s", ip)
	registry := k.getRegistry()
	err := k.execHostsAppend(ip, iputils.GetHostIP(registry.IP), registry.Domain)
	if err != nil {
		return fmt.Errorf("add registry hosts failed %v", err)
	}

	err = k.execAuth(ip)
	if err != nil {
		return fmt.Errorf("exec auth.sh failed %v", err)
	}
	return nil
}
