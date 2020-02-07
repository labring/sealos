package install

import (
	"fmt"
	"sync"
)

//BuildJoin is
func BuildJoin() {
	// 所有master节点
	masters := append(Masters, ParseIPs(MasterIPs)...)
	// 所有node节点
	nodes := append(Nodes, ParseIPs(NodeIPs)...)
	i := &SealosInstaller{
		Hosts: nodes,
		Masters: masters,
		Nodes: nodes,
	}
	i.CheckValid()
	i.SendPackage("kube")
	i.GeneratorToken()
	i.JoinNodes()
}

//GeneratorToken is
func (s *SealosInstaller) GeneratorToken() {
	cmd := `kubeadm token create --print-join-command`
	output := Cmd(s.Masters[0], cmd)
	decodeOutput(output)
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters() {
	cmd := s.Command(Version, JoinMaster)
	for _, master := range s.Masters[1:] {
		cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer)
		Cmd(master, cmdHosts)
		Cmd(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, IpFormat(s.Masters[0]), IpFormat(master))
		Cmd(master, cmdHosts)
		copyk8sConf := `mkdir -p /root/.kube && cp -i /etc/kubernetes/admin.conf /root/.kube/config`
		Cmd(master, copyk8sConf)
		cleaninstall := `rm -rf /root/kube`
		Cmd(master, cleaninstall)
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
			Cmd(node, cmdHosts)
			cmd := s.Command(Version, JoinNode)
			cmd += masters
			Cmd(node, cmd)
			cleaninstall := `rm -rf /root/kube`
			Cmd(node, cleaninstall)
		}(node)
	}

	wg.Wait()
}
