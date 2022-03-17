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
	"github.com/fanux/sealos/pkg/cert"
	"github.com/fanux/sealos/pkg/cmd"
	"github.com/fanux/sealos/pkg/cri"
	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
	"path"
)

func (k *KubeadmRuntime) bashInit(nodes []string) error {
	envProcessor := env.NewEnvProcessor(k.cluster)
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodes {
		node := node
		eg.Go(func() error {
			err := k.sshInterface.CmdAsync(node, envProcessor.WrapperShell(node, k.bash.InitBash()))
			if err != nil {
				return fmt.Errorf("exec init.sh failed %v", err)
			}
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) BashInitOnMaster0() error {
	return k.bashInit([]string{k.cluster.GetMaster0IP()})
}

func (k *KubeadmRuntime) ConfigInitKubeadmToMaster0() error {
	logger.Info("start to copy kubeadm config to master0")
	patches := []string{k.data.KubeKubeadmfile()}
	data, err := kubeadm.GetterInitKubeadmConfigFromTypes(k.resources, k.cluster, cri.DefaultContainerdCRISocket, patches)
	if err != nil {
		return fmt.Errorf("generator config init kubeadm config error: %s", err.Error())
	}
	initConfigPath := path.Join(k.data.TmpPath(), contants.DefaultInitKubeadmFileName)
	outConfigPath := path.Join(k.data.EtcPath(), contants.DefaultInitKubeadmFileName)
	err = file.WriteFile(initConfigPath, []byte(data))
	if err != nil {
		return fmt.Errorf("write config init kubeadm config error: %s", err.Error())
	}
	err = k.sshInterface.Copy(k.cluster.GetMaster0IP(), initConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy config init kubeadm config error: %s", err.Error())
	}
	return nil
}

func (k *KubeadmRuntime) GenerateCert() error {
	logger.Info("start to generator cert and copy to masters...")
	hostName, err := cmd.RemoteBashToString(k.data, k.sshInterface, k.cluster.GetMaster0IP(), k.ctl.Hostname())
	if err != nil {
		return err
	}
	err = cert.GenerateCert(
		k.data.PkiPath(),
		k.data.PkiEtcdPath(),
		k.cluster.GetCertSANS(),
		k.cluster.GetMaster0IP(),
		hostName,
		k.cluster.GetServiceCIDR(),
		k.cluster.GetDNSDomain(),
	)
	if err != nil {
		return fmt.Errorf("generate certs failed %v", err)
	}
	return k.sendNewCertAndKey([]string{k.cluster.GetMaster0IP()})
}

func (k *KubeadmRuntime) CreateKubeConfig() error {
	logger.Info("start to create kubeconfig...")
	hostName, err := cmd.RemoteBashToString(k.data, k.sshInterface, k.cluster.GetMaster0IP(), k.ctl.Hostname())
	if err != nil {
		return err
	}
	certConfig := cert.Config{
		Path:     k.data.PkiPath(),
		BaseName: "ca",
	}

	controlPlaneEndpoint := fmt.Sprintf("https://%s:6443", k.cluster.GetAPIServerDomain())
	err = cert.CreateJoinControlPlaneKubeConfigFiles(k.data.EtcPath(),
		certConfig, hostName, controlPlaneEndpoint, "kubernetes")
	if err != nil {
		return fmt.Errorf("generator kubeconfig failed %s", err)
	}
	return nil
}
