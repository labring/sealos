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
	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/remote"
	v1 "github.com/fanux/sealos/pkg/types/v1beta1"
)

func (k *KubeadmRuntime) getKubeVersion() string {
	return k.resources.Status.Version
}

func (k *KubeadmRuntime) getMaster0IP() string {
	return k.cluster.GetMaster0IP()
}

func (k *KubeadmRuntime) getVip() string {
	return k.cluster.GetVip()
}

func (k *KubeadmRuntime) getMasterIPList() []string {
	return k.cluster.GetMasterIPList()
}

func (k *KubeadmRuntime) getNodeIPList() []string {
	return k.cluster.GetNodeIPList()
}

func (k *KubeadmRuntime) getAPIServerDomain() string {
	return k.cluster.GetAPIServerDomain()
}

func (k *KubeadmRuntime) getMaster0IPAPIServer() string {
	return k.cluster.GetMaster0IPAPIServer()
}

func (k *KubeadmRuntime) getClusterAPIServer() string {
	return k.cluster.GetClusterAPIServer()
}

func (k *KubeadmRuntime) getCertSANS() []string {
	return k.cluster.GetCertSANS()
}

func (k *KubeadmRuntime) getServiceCIDR() string {
	return k.cluster.GetServiceCIDR()
}
func (k *KubeadmRuntime) getDNSDomain() string {
	return k.cluster.GetDNSDomain()
}

func (k *KubeadmRuntime) getInitKubeadmConfigFromTypes(resource *v1.Resource, cluster *v1.Cluster, cri string, patch []string) (string, error) {
	version := resource.Status.Version
	master0 := cluster.GetMaster0IP()
	apiserverDomain := cluster.GetAPIServerDomain()
	podCIDR := cluster.GetPodCIDR()
	svcCIDR := cluster.GetServiceCIDR()
	vip := cluster.GetVip()
	sans := cluster.GetCertSANS()
	return kubeadm.GetterInitKubeadmConfig(version, master0, apiserverDomain, podCIDR, svcCIDR, vip, cri, patch, sans)
}

func (k *KubeadmRuntime) execProxySync(ip, cmd string) error {
	return remote.BashSync(k.data, k.sshInterface, ip, cmd)
}

func (k *KubeadmRuntime) execProxyString(ip, cmd string) (string, error) {
	return remote.BashToString(k.data, k.sshInterface, ip, cmd)
}

func (k *KubeadmRuntime) execToken(ip string) (string, error) {
	return remote.BashToString(k.data, k.sshInterface, ip, k.ctl.Token())
}
func (k *KubeadmRuntime) execHostname(ip string) (string, error) {
	return remote.BashToString(k.data, k.sshInterface, ip, k.ctl.Hostname())
}
func (k *KubeadmRuntime) execHostsAppend(ip, host, domain string) error {
	return remote.BashSync(k.data, k.sshInterface, ip, k.ctl.HostsAdd(host, domain))
}

func (k *KubeadmRuntime) execHostsDelete(ip, domain string) error {
	return remote.BashSync(k.data, k.sshInterface, ip, k.ctl.HostsDelete(domain))
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
