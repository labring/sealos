package install

import (
	"fmt"
	"github.com/fanux/sealos/ipvs"
	"github.com/wonderivan/logger"
	"strings"
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
		Masters: ParseIPs(MasterIPs),
		Nodes:   nodes,
	}
	i.CheckValid()
	i.SendPackage()
	i.GeneratorToken()
	i.JoinNodes()
	//node join to NodeIPs
	NodeIPs = append(NodeIPs, joinNodes...)
}

//GeneratorToken is
//这里主要是为了获取CertificateKey
func (s *SealosInstaller) GeneratorCerts() {
	cmd := `kubeadm init phase upload-certs --upload-certs`
	output := SSHConfig.CmdToString(s.Masters[0], cmd, "\r\n")
	logger.Debug("[globals]decodeCertCmd: %s", output)
	slice := strings.Split(output, "Using certificate key:\r\n")
	slice1 := strings.Split(slice[1], "\r\n")
	CertificateKey = slice1[0]
	cmd = "kubeadm token create --print-join-command"
	out := SSHConfig.Cmd(s.Masters[0], cmd)
	decodeOutput(out)
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
		_ = SSHConfig.CmdAsync(master, cmdHosts)
		_ = SSHConfig.CmdAsync(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, IpFormat(s.Masters[0]), IpFormat(master))
		_ = SSHConfig.CmdAsync(master, cmdHosts)
		copyk8sConf := `mkdir -p /root/.kube && cp -i /etc/kubernetes/admin.conf /root/.kube/config`
		_ = SSHConfig.CmdAsync(master, copyk8sConf)
		cleaninstall := `rm -rf /root/kube`
		_ = SSHConfig.CmdAsync(master, cleaninstall)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range s.Masters {
		masters += fmt.Sprintf(" --rs %s:6443", IpFormat(master))
	}
	ipvsCmd := fmt.Sprintf("sealos ipvs --vs %s:6443 %s --health-path /healthz --health-schem https --run-once", VIP, masters)

	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", VIP, ApiServer)
			_ = SSHConfig.CmdAsync(node, cmdHosts)
			_ = SSHConfig.CmdAsync(node, ipvsCmd) // create ipvs rules before we join node
			cmd := s.Command(Version, JoinNode)
			//create lvscare static pod
			yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, "")
			_ = SSHConfig.CmdAsync(node, fmt.Sprintf("echo \"%s\" > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml", yaml))
			_ = SSHConfig.CmdAsync(node, cmd)
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
			yaml := ipvs.LvsStaticPodYaml(VIP, MasterIPs, "")
			_ = SSHConfig.CmdAsync(node, "rm -rf  /etc/kubernetes/manifests/kube-sealyun-lvscare*")
			_ = SSHConfig.CmdAsync(node, "echo \""+yaml+"\" > /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml")
		}(node)
	}

	wg.Wait()
}
