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

package kubernetes

import (
	"fmt"
	"path"

	"github.com/labring/sealos/pkg/cert"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (k *KubeadmRuntime) InitKubeadmConfigToMaster0() error {
	data, err := k.generateInitConfigs()
	if err != nil {
		return fmt.Errorf("generate init config error: %v", err)
	}
	initConfigPath := path.Join(k.pathResolver.TmpPath(), defaultInitKubeadmFileName)
	outConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultInitKubeadmFileName)
	err = file.WriteFile(initConfigPath, data)
	if err != nil {
		return fmt.Errorf("failed to write tmp init kubeadm config: %v", err)
	}

	logger.Info("Copying kubeadm config to master0")
	err = k.sshCopy(k.getMaster0IPAndPort(), initConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("failed to copy init kubeadm config: %v", err)
	}
	return nil
}

func (k *KubeadmRuntime) GenerateCert() error {
	logger.Info("start to generate and copy certs to masters...")
	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}

	logger.Debug("GenerateCert param:", k.pathResolver.PkiPath(),
		k.pathResolver.PkiEtcdPath(),
		k.getCertSANs(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain())
	return cert.GenerateCert(
		k.pathResolver.PkiPath(),
		k.pathResolver.PkiEtcdPath(),
		k.getCertSANs(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
	)
}

func (k *KubeadmRuntime) CreateKubeConfigFiles() error {
	logger.Info("start to create kubeconfig...")
	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	certConfig := cert.Config{
		Path:     k.pathResolver.PkiPath(),
		BaseName: "ca",
	}

	err = cert.CreateJoinControlPlaneKubeConfigFiles(k.pathResolver.EtcPath(),
		certConfig, hostName, k.getClusterAPIServer(), "kubernetes")
	if err != nil {
		return fmt.Errorf("failed to generate kubeconfig: %v", err)
	}
	return nil
}
