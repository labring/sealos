package install

import (
	"fmt"
	"github.com/fanux/sealos/ipvs"
	"sync"
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
	masters := ParseIPs(MasterIPs)
	nodes := ParseIPs(NodeIPs)
	i := &SealosInstaller{
		Hosts:   joinMasters,
		Masters: masters,
		Nodes:   nodes,
	}
	i.CheckValid()
	i.SendPackage("kube")
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
		Masters: ParseIPs(MasterIPs),
		Nodes:   nodes,
	}
	i.CheckValid()
	i.SendPackage("kube")
	i.GeneratorToken()
	i.JoinNodes()
	//node join to NodeIPs
	NodeIPs = append(NodeIPs, joinNodes...)
}

//GeneratorToken is
func (s *SealosInstaller) GeneratorCerts() {
	cmd := `kubeadm init phase upload-certs --upload-certs`
	output := SSHConfig.Cmd(s.Masters[0], cmd)
	decodeCertCmd(output)
	cmd = fmt.Sprintf("kubeadm token create --certificate-key %s --print-join-command", CertificateKey)
	output = SSHConfig.Cmd(s.Masters[0], cmd)
	decodeOutput(output)
}

//GeneratorToken is
func (s *SealosInstaller) GeneratorToken() {
	cmd := `kubeadm token create --print-join-command`
	output := SSHConfig.Cmd(s.Masters[0], cmd)
	decodeOutput(output)
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters(masters []string) {
	cmd := s.Command(Version, JoinMaster)
	for _, master := range masters {
		cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer)
		SSHConfig.Cmd(master, cmdHosts)
		SSHConfig.Cmd(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, IpFormat(s.Masters[0]), IpFormat(master))
		SSHConfig.Cmd(master, cmdHosts)
		copyk8sConf := `mkdir -p /root/.kube && cp -i /etc/kubernetes/admin.conf /root/.kube/config`
		SSHConfig.Cmd(master, copyk8sConf)
		cleaninstall := `rm -rf /root/kube`
		SSHConfig.Cmd(master, cleaninstall)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range s.Masters {
		masters += fmt.Sprintf(" --master %s:6443", IpFormat(master))
	}

	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", VIP, ApiServer)
			SSHConfig.Cmd(node, cmdHosts)
			cmd := s.Command(Version, JoinNode)
			cmd += masters
			SSHConfig.Cmd(node, cmd)
			cleaninstall := `rm -rf /root/kube`
			SSHConfig.Cmd(node, cleaninstall)
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
			yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, "")
			SSHConfig.Cmd(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare*")
			SSHConfig.Cmd(node, "echo \""+yaml+"\" > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml")
		}(node)
	}

	wg.Wait()
}
