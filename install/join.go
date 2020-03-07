package install

import (
	"fmt"
	"sync"
)

//BuildJoin is
func BuildJoin(joinMasters, joinNodes []string) {
	if len(joinMasters) > 0 {
		joinMastersFunc(joinMasters)
	}
	if len(joinNodes) > 0 {
		joinNodesFunc(joinMasters, joinNodes)
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
	i.lvscare(nodes)

}

//joinNodesFunc is join nodes func
func joinNodesFunc(joinMasters, joinNodes []string) {
	// 所有master节点
	masters := append(ParseIPs(MasterIPs), joinMasters...)
	// 所有node节点
	nodes := joinNodes
	i := &SealosInstaller{
		Hosts:   nodes,
		Masters: masters,
		Nodes:   nodes,
	}
	i.CheckValid()
	i.SendPackage("kube")
	i.GeneratorToken()
	i.JoinNodes()
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

func (s *SealosInstaller) lvscare(hosts []string) {
	var wg sync.WaitGroup
	for _, host := range hosts {
		wg.Add(1)
		go func(host string) {
			defer wg.Done()
			for _, master := range s.Hosts {
				cmd := fmt.Sprintf(`sed '/- https/a\    - %s:6443' -i /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml`, master)
				SSHConfig.Cmd(host, cmd)
				cmd = `sed '/- https/a\    - --rs' -i /etc/kubernetes/manifests/kube-sealyun-lvscare.yaml`
				SSHConfig.Cmd(host, cmd)
			}
		}(host)
	}

	wg.Wait()
}
