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
	"strings"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/remote"
	"github.com/labring/sealos/pkg/types/v1beta1"
)

func (k *KubeadmRuntime) getRegistry() *v1beta1.RegistryConfig {
	k.registryOnce.Do(func() {
		k.Registry = k.GetRegistryInfo(k.getContentData().RootFSPath(), k.getMaster0IPAndPort())
	})
	return k.Registry
}

func (k *KubeadmRuntime) getKubeVersion() string {
	return k.ClusterConfiguration.KubernetesVersion
}

func (k *KubeadmRuntime) getKubeVersionFromImage() string {
	labels := k.getImageLabels()
	image := labels[constants.ImageKubeVersionKey]
	if image == "" {
		return ""
	}
	return image
}

func (k *KubeadmRuntime) getMaster0IP() string {
	return iputils.GetHostIP(k.Cluster.GetMaster0IP())
}

func (k *KubeadmRuntime) getMasterIPList() []string {
	return k.Cluster.GetMasterIPList()
}

func (k *KubeadmRuntime) getMasterIPListAndHTTPSPort() []string {
	masters := make([]string, 0)
	for _, master := range k.getMasterIPList() {
		masters = append(masters, fmt.Sprintf("%s:%d", master, k.getAPIServerPort()))
	}
	return masters
}

func (k *KubeadmRuntime) getNodeIPList() []string {
	return k.Cluster.GetNodeIPList()
}

func (k *KubeadmRuntime) getMasterIPAndPortList() []string {
	return k.Cluster.GetMasterIPAndPortList()
}

func (k *KubeadmRuntime) getNodeIPAndPortList() []string {
	return k.Cluster.GetNodeIPAndPortList()
}

func (k *KubeadmRuntime) getMaster0IPAndPort() string {
	return k.Cluster.GetMaster0IPAndPort()
}

func (k *KubeadmRuntime) getMaster0IPAPIServer() string {
	return k.Cluster.GetMaster0IPAPIServer()
}

func (k *KubeadmRuntime) getLvscareImage() (string, error) {
	labels := k.getImageLabels()
	image := labels[constants.ImageKubeLvscareImageKey]
	if image == "" {
		image = constants.DefaultLvsCareImage
	}
	return image, nil
}

func (k *KubeadmRuntime) execIPVS(ip string, masters []string) error {
	return k.getRemoteInterface().IPVS(ip, k.getVipAndPort(), masters)
}

func (k *KubeadmRuntime) execIPVSClean(ip string) error {
	return k.getRemoteInterface().IPVSClean(ip, k.getVipAndPort())
}

func (k *KubeadmRuntime) syncNodeIPVSYaml(masterIPs, nodesIPs []string) error {
	masters := make([]string, 0)
	for _, master := range masterIPs {
		masters = append(masters, fmt.Sprintf("%s:%d", iputils.GetHostIP(master), k.getAPIServerPort()))
	}

	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodesIPs {
		node := node
		eg.Go(func() error {
			logger.Info("start to sync lvscare static pod to node: %s master: %+v", node, masters)
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
	return k.getRemoteInterface().StaticPod(ip, k.getVipAndPort(), constants.LvsCareStaticPodName, image, masters)
}

func (k *KubeadmRuntime) execToken(ip string) (string, error) {
	return k.getRemoteInterface().Token(ip)
}
func (k *KubeadmRuntime) execHostname(ip string) (string, error) {
	hostname, err := k.getRemoteInterface().Hostname(ip)
	//tips: if hostname is upper,kubelet init master0 is not allowed to modify node
	return strings.ToLower(hostname), err
}
func (k *KubeadmRuntime) execHostsAppend(ip, host, domain string) error {
	return k.getRemoteInterface().HostsAdd(ip, iputils.GetHostIP(host), domain)
}

func (k *KubeadmRuntime) execCert(ip string) error {
	hostname, err := k.execHostname(ip)
	if err != nil {
		return err
	}
	return k.getRemoteInterface().Cert(ip, k.getCertSANS(), iputils.GetHostIP(ip), hostname, k.getServiceCIDR(), k.getDNSDomain())
}

func (k *KubeadmRuntime) execHostsDelete(ip, domain string) error {
	return k.getRemoteInterface().HostsDelete(ip, domain)
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
	return k.Cluster.GetImageLabels()
}

func (k *KubeadmRuntime) getSSHInterface() ssh.Interface {
	return ssh.NewSSHClient(&k.Cluster.Spec.SSH, true)
}

func (k *KubeadmRuntime) getENVInterface() env.Interface {
	return env.NewEnvProcessor(k.Cluster, k.Cluster.Status.Mounts)
}

func (k *KubeadmRuntime) getRemoteInterface() remote.Interface {
	return remote.New(k.getClusterName(), k.getSSHInterface())
}

func (k *KubeadmRuntime) getScriptsBash() constants.Bash {
	render := k.getImageLabels()
	return constants.NewBash(k.getClusterName(), render)
}

func (k *KubeadmRuntime) getContentData() constants.Data {
	return constants.NewData(k.getClusterName())
}

func GetConstantData(clusterName string) constants.Data {
	return constants.NewData(clusterName)
}
