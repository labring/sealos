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

package helpers

import (
	"fmt"
	"path"

	"github.com/labring/image-cri-shim/pkg/types"

	"k8s.io/apimachinery/pkg/util/yaml"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

const RegistryCustomConfig = "registry.yml"

func GetRegistryInfo(execer exec.Interface, rootfs, defaultRegistry string) *v1beta1.RegistryConfig {
	var DefaultConfig = &v1beta1.RegistryConfig{
		IP:       iputils.GetHostIP(defaultRegistry),
		Domain:   constants.DefaultRegistryDomain,
		Port:     "5000",
		Username: constants.DefaultRegistryUsername,
		Password: constants.DefaultRegistryPassword,
		Data:     constants.DefaultRegistryData,
	}
	etcPath := path.Join(rootfs, constants.EtcDirName, RegistryCustomConfig)
	out, err := execer.Cmd(defaultRegistry, fmt.Sprintf("cat %s", etcPath))
	if err != nil {
		logger.Warn("load registry config error: %+v, using default registry config", err)
		return DefaultConfig
	}
	logger.Debug("registry config data info: %s", string(out))
	readConfig := &v1beta1.RegistryConfig{}
	err = yaml.Unmarshal(out, &readConfig)
	if err != nil {
		logger.Warn("read registry config path error: %+v, using default registry config", err)
		return DefaultConfig
	}
	if readConfig.IP == "" {
		readConfig.IP = defaultRegistry
	}
	if readConfig.Domain == "" {
		readConfig.Domain = DefaultConfig.Domain
	}
	if readConfig.Port == "" {
		readConfig.Port = DefaultConfig.Port
	}
	logger.Debug("show registry info, IP: %s, Domain: %s, Data: %s", readConfig.IP, readConfig.Domain, readConfig.Data)
	return readConfig
}

func GetImageCRIShimInfo(execer exec.Interface, config, defaultIP string) *types.Config {
	out, _ := execer.Cmd(defaultIP, fmt.Sprintf("cat %s", config))
	logger.Debug("image shim data info: %s", string(out))
	readConfig := &types.Config{}
	err := yaml.Unmarshal(out, &readConfig)
	if err != nil {
		logger.Warn("read image shim config path error: %+v", err)
		return nil
	}
	logger.Debug("show registry info, addr: %s,  auth: %s", readConfig.Address, readConfig.Auth)
	return readConfig
}
