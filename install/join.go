// Copyright © 2021 sealos.
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

package install

import (
	"fmt"
	"strings"
	"sync"

	"github.com/fanux/sealos/cert"
	"github.com/fanux/sealos/ipvs"
	"github.com/fanux/sealos/pkg/logger"
)

//BuildJoin is
func BuildJoin(joinMasters, joinNodes []string) {
	if len(joinMasters) > 0 {
		joinMastersFunc(joinMasters)
	}
	if len(joinNodes) > 0 {
		joinNodesFunc(joinNodes)
	}
}

func joinMastersFunc(joinMasters []string) {
	masters := MasterIPs
	nodes := NodeIPs
	i := &SealosInstaller{
		Hosts:     joinMasters,
		Masters:   masters,
		Nodes:     nodes,
		Network:   Network,
		APIServer: APIServer,
	}
	i.CheckValid()
	i.SendSealos()
	i.SendPackage()
	i.GeneratorCerts()
	i.JoinMasters(joinMasters)
	//master join to MasterIPs
	MasterIPs = append(MasterIPs, joinMasters...)
	i.lvscare()
}

//joinNodesFunc is join nodes func
func joinNodesFunc(joinNodes []string) {
	// 所有node节点
	nodes := joinNodes
	i := &SealosInstaller{
		Hosts:   nodes,
		Masters: MasterIPs,
		Nodes:   nodes,
	}
	i.CheckValid()
	i.SendSealos()
	i.SendPackage()
	i.GeneratorToken()
	i.JoinNodes()
	//node join to NodeIPs
	NodeIPs = append(NodeIPs, joinNodes...)
}

//GeneratorToken is
//这里主要是为了获取CertificateKey
func (s *SealosInstaller) GeneratorCerts() {
	cmd := `kubeadm init phase upload-certs --upload-certs` + vlogToStr()
	output := SSHConfig.CmdToString(s.Masters[0], cmd, "\r\n")
	logger.Debug("[globals]decodeCertCmd: %s", output)
	slice := strings.Split(output, "Using certificate key:\r\n")
	slice1 := strings.Split(slice[1], "\r\n")
	CertificateKey = slice1[0]
	cmd = "kubeadm token create --print-join-command" + vlogToStr()
	out := SSHConfig.Cmd(s.Masters[0], cmd)
	decodeOutput(out)
}

//GeneratorToken is
func (s *SealosInstaller) GeneratorToken() {
	cmd := `kubeadm token create --print-join-command` + vlogToStr()
	output := SSHConfig.Cmd(s.Masters[0], cmd)
	decodeOutput(output)
}

// 返回/etc/hosts记录
func getApiserverHost(ipAddr string) (host string) {
	return fmt.Sprintf("%s %s", ipAddr, APIServer)
}

// sendJoinCPConfig send join CP nodes configuration
func (s *SealosInstaller) sendJoinCPConfig(joinMaster []string) {
	var wg sync.WaitGroup
	for _, master := range joinMaster {
		wg.Add(1)
		go func(master string) {
			defer wg.Done()
			cgroup := s.getCgroupDriverFromShell(master)
			templateData := string(JoinTemplate(IPFormat(master), cgroup))
			cmd := fmt.Sprintf(`echo "%s" > /root/kubeadm-join-config.yaml`, templateData)
			_ = SSHConfig.CmdAsync(master, cmd)
		}(master)
	}
	wg.Wait()
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters(masters []string) {
	var wg sync.WaitGroup
	//copy certs & kube-config
	s.SendJoinMasterKubeConfigs(masters)
	s.sendNewCertAndKey(masters)
	// send CP nodes configuration
	s.sendJoinCPConfig(masters)

	//join master do sth
	cmd := s.Command(Version, JoinMaster)
	for _, master := range masters {
		wg.Add(1)
		go func(master string) {
			defer wg.Done()
			hostname := GetRemoteHostName(master)
			certCMD := cert.CMD(APIServerCertSANs, IPFormat(master), hostname, SvcCIDR, DNSDomain)
			_ = SSHConfig.CmdAsync(master, certCMD)

			cmdHosts := fmt.Sprintf("echo %s >> /etc/hosts", getApiserverHost(IPFormat(s.Masters[0])))
			_ = SSHConfig.CmdAsync(master, cmdHosts)
			// cmdMult := fmt.Sprintf("%s --apiserver-advertise-address %s", cmd, IpFormat(master))
			_ = SSHConfig.CmdAsync(master, cmd)
			cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, getApiserverHost(IPFormat(s.Masters[0])), getApiserverHost(IPFormat(master)))
			_ = SSHConfig.CmdAsync(master, cmdHosts)
			copyk8sConf := `rm -rf .kube/config && mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config && chmod 600 /root/.kube/config`
			_ = SSHConfig.CmdAsync(master, copyk8sConf)
			cleaninstall := `rm -rf /root/kube || :`
			_ = SSHConfig.CmdAsync(master, cleaninstall)
		}(master)
	}
	wg.Wait()
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range s.Masters {
		masters += fmt.Sprintf(" --rs %s:6443", IPFormat(master))
	}
	ipvsCmd := fmt.Sprintf("sealos ipvs --vs %s:6443 %s --health-path /healthz --health-schem https --run-once", VIP, masters)
	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			// send join node config
			cgroup := s.getCgroupDriverFromShell(node)
			templateData := string(JoinTemplate("", cgroup))
			cmdJoinConfig := fmt.Sprintf(`echo "%s" > /root/kubeadm-join-config.yaml`, templateData)
			_ = SSHConfig.CmdAsync(node, cmdJoinConfig)

			cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", VIP, APIServer)
			_ = SSHConfig.CmdAsync(node, cmdHosts)

			// 如果不是默认路由， 则添加 vip 到 master的路由。
			cmdRoute := fmt.Sprintf("sealos route --host %s", IPFormat(node))
			status := SSHConfig.CmdToString(node, cmdRoute, "")
			if status != "ok" {
				// 以自己的ip作为路由网关
				addRouteCmd := fmt.Sprintf("sealos route add --host %s --gateway %s", VIP, IPFormat(node))
				SSHConfig.CmdToString(node, addRouteCmd, "")
			}

			_ = SSHConfig.CmdAsync(node, ipvsCmd) // create ipvs rules before we join node
			cmd := s.Command(Version, JoinNode)
			//create lvscare static pod
			yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, LvscareImage)
			_ = SSHConfig.CmdAsync(node, cmd)
			_ = SSHConfig.Cmd(node, "mkdir -p /etc/kubernetes/manifests")
			SSHConfig.CopyConfigFile(node, "/etc/kubernetes/manifests/kube-sealyun-lvscare.yaml", []byte(yaml))

			cleaninstall := `rm -rf /root/kube`
			_ = SSHConfig.CmdAsync(node, cleaninstall)
		}(node)
	}

	wg.Wait()
}

func (s *SealosInstaller) lvscare() {
	var wg sync.WaitGroup
	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, LvscareImage)
			_ = SSHConfig.Cmd(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare* || :")
			SSHConfig.CopyConfigFile(node, "/etc/kubernetes/manifests/kube-sealyun-lvscare.yaml", []byte(yaml))
		}(node)
	}

	wg.Wait()
}

func (s *SealosInstaller) sendNewCertAndKey(Hosts []string) {
	var wg sync.WaitGroup
	for _, node := range Hosts {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			SSHConfig.CopyLocalToRemote(node, CertPath, cert.KubeDefaultCertPath)
		}(node)
	}
	wg.Wait()
}

func (s *SealosInstaller) sendKubeConfigFile(hosts []string, kubeFile string) {
	absKubeFile := cert.KubernetesDir + "/" + kubeFile
	sealosKubeFile := cert.SealosConfigDir + "/" + kubeFile
	var wg sync.WaitGroup
	for _, node := range hosts {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			SSHConfig.CopyLocalToRemote(node, sealosKubeFile, absKubeFile)
		}(node)
	}
	wg.Wait()
}
