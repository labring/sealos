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

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/remote"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) getRegistry() *RegistryConfig {
	return GetRegistry(k.getContantData().RootFSPath(), k.getMaster0IP())
}

func (k *KubeadmRuntime) getKubeVersion() string {
	return k.ClusterConfiguration.KubernetesVersion
}

func (k *KubeadmRuntime) getKubeVersionFromImage() string {
	labels := k.getImageLabels()
	image := labels["version"]
	if image == "" {
		return ""
	}
	return image
}

func (k *KubeadmRuntime) getMaster0IP() string {
	return k.Cluster.GetMaster0IP()
}

func (k *KubeadmRuntime) getMasterIPList() []string {
	return k.Cluster.GetMasterIPList()
}

func (k *KubeadmRuntime) getMasterIPListAndPort() []string {
	masters := make([]string, 0)
	for _, master := range k.getMasterIPList() {
		masters = append(masters, fmt.Sprintf("%s:6443", master))
	}
	return masters
}

func (k *KubeadmRuntime) getNodeIPList() []string {
	return k.Cluster.GetNodeIPList()
}

func (k *KubeadmRuntime) getMaster0IPAPIServer() string {
	return k.Cluster.GetMaster0IPAPIServer()
}

func (k *KubeadmRuntime) getLvscareImage() (string, error) {
	labels := k.getImageLabels()
	image := labels["image"]
	if image == "" {
		image = contants.DefaultLvsCareImage
	}
	return image, nil
}

func (k *KubeadmRuntime) execIPVS(ip string, masters []string) error {
	return k.getRemoteInterface().IPVS(ip, k.getVipAndPort(), masters)
}

func (k *KubeadmRuntime) syncNodeIPVSYaml(masterIPs []string) error {
	masters := make([]string, 0)
	for _, master := range masterIPs {
		masters = append(masters, fmt.Sprintf("%s:6443", master))
	}

	logger.Info("start to sync lvscare static pod")
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range k.getNodeIPList() {
		node := node
		eg.Go(func() error {
			err := k.execIPVSPod(node, masters)
			if err != nil {
				return fmt.Errorf("update lvscare static pod failed %s %v", node, err)
			}
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) execIPVSPod(ip string, masters []string) error {
	image, err := k.getLvscareImage()
	if err != nil {
		return err
	}
	return k.getRemoteInterface().StaticPod(ip, k.getVipAndPort(), contants.LvsCareStaticPodName, image, masters)
}

func (k *KubeadmRuntime) execToken(ip string) (string, error) {
	return k.getRemoteInterface().Token(ip)
}
func (k *KubeadmRuntime) execHostname(ip string) (string, error) {
	return k.getRemoteInterface().Hostname(ip)
}
func (k *KubeadmRuntime) execHostsAppend(ip, host, domain string) error {
	return k.getRemoteInterface().HostsAdd(ip, host, domain)
}

func (k *KubeadmRuntime) execCert(ip string) error {
	hostname, err := k.execHostname(ip)
	if err != nil {
		return err
	}
	return k.getRemoteInterface().Cert(ip, k.getCertSANS(), ip, hostname, k.getServiceCIDR(), k.getDNSDomain())
}

func (k *KubeadmRuntime) execHostsDelete(ip, domain string) error {
	return k.getRemoteInterface().HostsDelete(ip, domain)
}

func (k *KubeadmRuntime) execInit(ip string) error {
	return k.getSSHInterface().CmdAsync(ip, k.getENVInterface().WrapperShell(ip, k.getScriptsBash().InitBash()))
}

func (k *KubeadmRuntime) execClean(ip string) error {
	return k.getSSHInterface().CmdAsync(ip, k.getENVInterface().WrapperShell(ip, k.getScriptsBash().CleanBash()))
}
func (k *KubeadmRuntime) execInitRegistry(ip string) error {
	return k.getSSHInterface().CmdAsync(ip, k.getENVInterface().WrapperShell(ip, k.getScriptsBash().InitRegistryBash()))
}
func (k *KubeadmRuntime) execCleanRegistry(ip string) error {
	return k.getSSHInterface().CmdAsync(ip, k.getENVInterface().WrapperShell(ip, k.getScriptsBash().CleanRegistryBash()))
}
func (k *KubeadmRuntime) execAuth(ip string) error {
	return k.getSSHInterface().CmdAsync(ip, k.getENVInterface().WrapperShell(ip, k.getScriptsBash().AuthBash()))
}

func (k *KubeadmRuntime) sshCmdAsync(host string, cmd ...string) error {
	return k.getSSHInterface().CmdAsync(host, cmd...)
}

func (k *KubeadmRuntime) sshCopy(host, srcFilePath, dstFilePath string) error {
	return k.getSSHInterface().Copy(host, srcFilePath, dstFilePath)
}

func (k *KubeadmRuntime) getImageLabels() map[string]string {
	return k.ImageInfo.Config.Labels
}

func (k *KubeadmRuntime) getSSHInterface() ssh.Interface {
	return ssh.NewSSHClient(&k.Cluster.Spec.SSH, true)
}

func (k *KubeadmRuntime) getENVInterface() env.Interface {
	return env.NewEnvProcessor(k.Cluster, k.ImageInfo)
}

func (k *KubeadmRuntime) getRemoteInterface() remote.Interface {
	return remote.New(k.getClusterName(), k.getSSHInterface())
}

func (k *KubeadmRuntime) getScriptsBash() contants.Bash {
	render := k.getImageLabels()
	return contants.NewBash(k.getClusterName(), render)
}

func (k *KubeadmRuntime) getContantData() contants.Data {
	return contants.NewData(k.getClusterName())
}

func GetContantData(clusterName string) contants.Data {
	return contants.NewData(clusterName)
}
