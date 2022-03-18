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

package runtime

import (
	"context"
	"fmt"
	"path"

	"github.com/fanux/sealos/pkg/cert"
	"github.com/fanux/sealos/pkg/cri"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) bashInit(nodes []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodes {
		node := node
		eg.Go(func() error {
			err := k.execInit(node)
			if err != nil {
				return fmt.Errorf("exec init.sh failed %v", err)
			}
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) BashInitOnMaster0() error {
	logger.Info("start to init filesystem master0...")
	err := k.bashInit([]string{k.getMaster0IP()})
	if err != nil {
		return fmt.Errorf("filesystem init failed %v", err)
	}
	return nil
}

func (k *KubeadmRuntime) ConfigInitKubeadmToMaster0() error {
	logger.Info("start to copy kubeadm config to master0")
	patches := []string{k.data.KubeKubeadmfile()}
	data, err := k.getInitKubeadmConfigFromTypes(k.resources, k.cluster, cri.DefaultContainerdCRISocket, patches)
	if err != nil {
		return fmt.Errorf("generator config init kubeadm config error: %s", err.Error())
	}
	initConfigPath := path.Join(k.data.TmpPath(), contants.DefaultInitKubeadmFileName)
	outConfigPath := path.Join(k.data.EtcPath(), contants.DefaultInitKubeadmFileName)
	err = file.WriteFile(initConfigPath, []byte(data))
	if err != nil {
		return fmt.Errorf("write config init kubeadm config error: %s", err.Error())
	}
	err = k.sshCopy(k.getMaster0IP(), initConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy config init kubeadm config error: %s", err.Error())
	}
	return nil
}

func (k *KubeadmRuntime) GenerateCert() error {
	logger.Info("start to generator cert and copy to masters...")
	hostName, err := k.execHostname(k.getMaster0IP())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	err = cert.GenerateCert(
		k.data.PkiPath(),
		k.data.PkiEtcdPath(),
		k.getCertSANS(),
		k.getMaster0IP(),
		hostName,
		k.getServiceCIDR(),
		k.getDNSDomain(),
	)
	if err != nil {
		return fmt.Errorf("generate certs failed %v", err)
	}
	return k.sendNewCertAndKey([]string{k.getMaster0IP()})
}

func (k *KubeadmRuntime) CreateKubeConfig() error {
	logger.Info("start to create kubeconfig...")
	hostName, err := k.execHostname(k.getMaster0IP())
	if err != nil {
		return fmt.Errorf("get hostname failed %v", err)
	}
	certConfig := cert.Config{
		Path:     k.data.PkiPath(),
		BaseName: "ca",
	}

	err = cert.CreateJoinControlPlaneKubeConfigFiles(k.data.EtcPath(),
		certConfig, hostName, k.getClusterAPIServer(), "kubernetes")
	if err != nil {
		return fmt.Errorf("generator kubeconfig failed %s", err)
	}
	return nil
}
