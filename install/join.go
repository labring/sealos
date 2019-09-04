package install

import (
	"fmt"
	"sync"
)

//BuildJoin is
func BuildJoin(masters []string, nodes []string, vip, pkgUrl string) {
	i := &SealosInstaller{
		Masters: masters,
		Nodes:   nodes,
		VIP:     vip,
		PkgUrl:  pkgUrl,
		Hosts:   nodes,
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
	cmd := fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s --experimental-control-plane --certificate-key %s", s.Masters[0], JoinToken, TokenCaCertHash, CertificateKey)

	for _, master := range s.Masters[1:] {
		cmdHosts := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
		Cmd(master, cmdHosts)
		Cmd(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, s.Masters[0], master)
		Cmd(master, cmdHosts)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range s.Masters {
		masters += fmt.Sprintf(" --master %s:6443", master)
	}

	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			cmdHosts := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.VIP)
			Cmd(node, cmdHosts)
			cmd := fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s", s.VIP, JoinToken, TokenCaCertHash)
			cmd += masters
			Cmd(node, cmd)
		}(node)
	}

	wg.Wait()
}
