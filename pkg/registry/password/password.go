/*
Copyright 2023 cuisongliu@qq.com.

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

package password

import (
	"fmt"
	"path"

	"github.com/labring/image-cri-shim/pkg/types"
	"k8s.io/apimachinery/pkg/util/sets"
	"sigs.k8s.io/yaml"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/registry/helpers"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/passwd"
)

type RegistryType string

const (
	RegistryTypeDocker     RegistryType = "docker"
	RegistryTypeContainerd RegistryType = "containerd"
	RegistryTypeRegistry   RegistryType = "registry"
)

type Upgrade interface {
	UpdateRegistryPasswd(rc *v1beta1.RegistryConfig, target, host string, registryType RegistryType) error
	UpdateRegistryConfig(rc *v1beta1.RegistryConfig, target, host string) error
	UpdateImageShimConfig(rc *types.Config, target, host string) error
}

func NewUpgrade(name string, sshInterface exec.Interface) Upgrade {
	return &upgrade{Cluster: name, SSHInterface: sshInterface, mk: &maker{sets.New[string]()}}
}

type maker struct {
	paths sets.Set[string]
}

type upgrade struct {
	Cluster            string
	SSHInterface       exec.Interface
	RegistryConfig     *v1beta1.RegistryConfig
	ImageCRIShimConfig *types.Config
	mk                 *maker
}

func (m *upgrade) UpdateRegistryConfig(rc *v1beta1.RegistryConfig, target, host string) error {
	configPath, err := m.mk.configLocalRegistryConfig(path.Join(constants.ClusterDir(m.Cluster), constants.EtcDirName), rc)
	if err != nil {
		return err
	}
	if target == "" {
		return fmt.Errorf("update registry target path is empty")
	}
	if len(configPath) > 0 {
		if err = m.SSHInterface.Copy(host, configPath, target); err != nil {
			return err
		}
	}
	return nil
}
func (m *upgrade) UpdateImageShimConfig(rc *types.Config, target, host string) error {
	configPath, err := m.mk.configLocalImageShimConfig(path.Join(constants.ClusterDir(m.Cluster), constants.EtcDirName), rc)
	if err != nil {
		return err
	}
	if target == "" {
		return fmt.Errorf("update image shim target path is empty")
	}
	if len(configPath) > 0 {
		if err = m.SSHInterface.Copy(host, configPath, target); err != nil {
			return err
		}
		if err = m.SSHInterface.CmdAsync(host, "systemctl restart image-cri-shim"); err != nil {
			return err
		}
	}
	return nil
}
func (m *upgrade) UpdateRegistryPasswd(rc *v1beta1.RegistryConfig, target, host string, registryType RegistryType) error {
	htpasswdPath, err := m.mk.configLocalHtpasswd(path.Join(constants.ClusterDir(m.Cluster), constants.EtcDirName), rc)
	if err != nil {
		return err
	}
	if target == "" {
		target = path.Join(constants.GetRootWorkDir(m.Cluster), constants.EtcDirName, "registry_htpasswd")
	}
	if len(htpasswdPath) > 0 {
		if err = m.SSHInterface.Copy(host, htpasswdPath, target); err != nil {
			return err
		}
	}
	if registryType != "" {
		switch registryType {
		case RegistryTypeDocker:
			if err = m.SSHInterface.CmdAsync(host, "docker restart sealos-registry"); err != nil {
				return err
			}
		case RegistryTypeContainerd:
			if err = m.SSHInterface.CmdAsync(host, "nerdctl restart sealos-registry"); err != nil {
				return err
			}
		case RegistryTypeRegistry:
			if err = m.SSHInterface.CmdAsync(host, "systemctl restart registry"); err != nil {
				return err
			}
		}
	}
	return nil
}

func (m *maker) configLocalHtpasswd(cfgBasedir string, rc *v1beta1.RegistryConfig) (string, error) {
	if rc.Username == "" || rc.Password == "" {
		logger.Warn("registry username or password is empty")
		return "", nil
	}
	fp := path.Join(cfgBasedir, "registry_htpasswd")
	if !m.paths.Has(fp) {
		pwd := passwd.Htpasswd(rc.Username, rc.Password)
		if err := file.WriteFile(fp, []byte(pwd)); err != nil {
			return "", fmt.Errorf("failed to make htpasswd: %v", err)
		}
	}
	return fp, nil
}

func (m *maker) configLocalRegistryConfig(cfgBasedir string, rc *v1beta1.RegistryConfig) (string, error) {
	data, err := yaml.Marshal(rc)
	if err != nil {
		return "", err
	}
	fp := path.Join(cfgBasedir, helpers.RegistryCustomConfig)
	if !m.paths.Has(fp) {
		if err = file.WriteFile(fp, data); err != nil {
			return "", fmt.Errorf("failed to make registry config: %v", err)
		}
	}
	return fp, nil
}

func (m *maker) configLocalImageShimConfig(cfgBasedir string, rc *types.Config) (string, error) {
	data, err := yaml.Marshal(rc)
	if err != nil {
		return "", err
	}
	fp := path.Join(cfgBasedir, "image-cri-shim.yaml")
	if !m.paths.Has(fp) {
		if err = file.WriteFile(fp, data); err != nil {
			return "", fmt.Errorf("failed to make registry config: %v", err)
		}
	}
	return fp, nil
}
