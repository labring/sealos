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

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/cert"
)

func (k *KubeadmRuntime) ConfigInitKubeadmToMaster0() error {
	logger.Info("start to copy kubeadm config to master0")
	data, err := k.generateInitConfigs()
	if err != nil {
		return fmt.Errorf("generator config init kubeadm config error: %s", err.Error())
	}
	initConfigPath := path.Join(k.getContentData().TmpPath(), constants.DefaultInitKubeadmFileName)
	outConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultInitKubeadmFileName)
	err = file.WriteFile(initConfigPath, data)
	if err != nil {
		return fmt.Errorf("write Config init kubeadm config error: %s", err.Error())
	}
	err = k.sshCopy(k.getMaster0IPAndPort(), initConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy Config init kubeadm Config error: %s", err.Error())
	}
	return nil
}

func (k *KubeadmRuntime) GenerateCert() error {
	logger.Info("start to generator cert and copy to masters...")
	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	err = cert.GenerateCert(
		k.getContentData().PkiPath(),
		k.getContentData().PkiEtcdPath(),
		k.getCertSANS(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
	)
	if err != nil {
		return fmt.Errorf("generate certs failed %v", err)
	}
	return k.sendNewCertAndKey([]string{k.getMaster0IPAndPort()})
}

func (k *KubeadmRuntime) CreateKubeConfig() error {
	logger.Info("start to create kubeconfig...")
	hostName, err := k.execHostname(k.getMaster0IPAndPort())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	certConfig := cert.Config{
		Path:     k.getContentData().PkiPath(),
		BaseName: "ca",
	}

	err = cert.CreateJoinControlPlaneKubeConfigFiles(k.getContentData().EtcPath(),
		certConfig, hostName, k.getClusterAPIServer(), "kubernetes")
	if err != nil {
		return fmt.Errorf("generator kubeconfig failed %s", err)
	}
	return nil
}
