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

	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) getKubeVersion() string {
	return k.resources.Status.Version
}

func (k *KubeadmRuntime) getMaster0IP() string {
	return k.cluster.GetMaster0IP()
}

func (k *KubeadmRuntime) getMasterIPList() []string {
	return k.cluster.GetMasterIPList()
}

func (k *KubeadmRuntime) getMasterIPListAndPort() []string {
	masters := make([]string, 0)
	for _, master := range k.getMasterIPList() {
		masters = append(masters, fmt.Sprintf("%s:6443", master))
	}
	return masters
}

func (k *KubeadmRuntime) getNodeIPList() []string {
	return k.cluster.GetNodeIPList()
}

func (k *KubeadmRuntime) getMaster0IPAPIServer() string {
	return k.cluster.GetMaster0IPAPIServer()
}

func (k *KubeadmRuntime) getLvscareImage() string {
	return k.resources.Status.Image
}

func (k *KubeadmRuntime) execIPVS(ip string, masters []string) error {
	return k.ctlInterface.IPVS(ip, k.getVipAndPort(), masters)
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
	return k.ctlInterface.StaticPod(ip, k.getVipAndPort(), contants.LvsCareStaticPodName, k.getLvscareImage(), masters)
}

func (k *KubeadmRuntime) execToken(ip string) (string, error) {
	return k.ctlInterface.Token(ip)
}
func (k *KubeadmRuntime) execHostname(ip string) (string, error) {
	return k.ctlInterface.Hostname(ip)
}
func (k *KubeadmRuntime) execHostsAppend(ip, host, domain string) error {
	return k.ctlInterface.HostsAdd(ip, host, domain)
}

func (k *KubeadmRuntime) execCert(ip string) error {
	hostname, err := k.execHostname(ip)
	if err != nil {
		return err
	}
	return k.ctlInterface.Cert(ip, k.getCertSANS(), ip, hostname, k.getServiceCIDR(), k.getDNSDomain())
}

func (k *KubeadmRuntime) execHostsDelete(ip, domain string) error {
	return k.ctlInterface.HostsDelete(ip, domain)
}

func (k *KubeadmRuntime) execInit(ip string) error {
	return k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.InitBash()))
}

func (k *KubeadmRuntime) execClean(ip string) error {
	return k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.CleanBash()))
}
func (k *KubeadmRuntime) execInitRegistry(ip string) error {
	return k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.InitRegistryBash()))
}
func (k *KubeadmRuntime) execCleanRegistry(ip string) error {
	return k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.CleanRegistryBash()))
}
func (k *KubeadmRuntime) execAuth(ip string) error {
	return k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.AuthBash()))
}

func (k *KubeadmRuntime) sshCmdAsync(host string, cmd ...string) error {
	return k.sshInterface.CmdAsync(host, cmd...)
}

func (k *KubeadmRuntime) sshCopy(host, srcFilePath, dstFilePath string) error {
	return k.sshInterface.Copy(host, srcFilePath, dstFilePath)
}
