package install

import "fmt"

//SendPackage is
func (s *SealosInstaller) SendPackage(pkg string, url string) {
	//TODO send package file on every nodes

	cmd := fmt.Sprintf("tar zxvf %s && cd ~/kube/shell && sh init.sh", pkg)
	if url != "" {
		cmd = fmt.Sprintf("wget %s && tar zxvf %s && cd ~/kube/shell && sh init.sh", url, pkg)
	}
	for _, master := range s.Masters {
		Cmd(master, cmd)
	}
	for _, node := range s.Nodes {
		Cmd(node, cmd)
	}
}
