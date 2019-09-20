package install

import (
	"fmt"
	"sync"
)

//BuildJoin is
func BuildJoin() {
	i := &SealosInstaller{
		Hosts: Nodes,
	}
	i.CheckValid()
	i.SendPackage("kube")
	i.GeneratorToken()
	i.JoinNodes()
}

//GeneratorToken is
func (s *SealosInstaller) GeneratorToken() {
	cmd := `kubeadm token create --print-join-command`
	output := Cmd(Masters[0], cmd)
	decodeOutput(output)
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters() {
	cmd := s.Command(Version, JoinMaster)
	for _, master := range Masters[1:] {
		cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", IpFormat(Masters[0]), ApiServer)
		Cmd(master, cmdHosts)
		Cmd(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, IpFormat(Masters[0]), IpFormat(master))
		Cmd(master, cmdHosts)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range Masters {
		masters += fmt.Sprintf(" --master %s:6443", IpFormat(master))
	}

	for _, node := range Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			cmdHosts := fmt.Sprintf("echo %s %s >> /etc/hosts", VIP, ApiServer)
			Cmd(node, cmdHosts)
			cmd := s.Command(Version, JoinNode)
			cmd += masters
			Cmd(node, cmd)
		}(node)
	}

	wg.Wait()
}
