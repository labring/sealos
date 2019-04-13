package install

import (
	"fmt"
	"sync"
)

//SendPackage is
func (s *SealosInstaller) SendPackage(pkg string, url string) {
	//TODO send package file on every nodes

	if pkg == "" {
		return
	}
	cmd := fmt.Sprintf("tar zxvf %s && cd ~/kube/shell && sh init.sh", pkg)
	if url != "" {
		cmd = fmt.Sprintf("wget %s && tar zxvf %s && cd ~/kube/shell && sh init.sh", url, pkg)
	}
	var wm sync.WaitGroup
	var wn sync.WaitGroup
	for _, master := range s.Masters {
		wm.Add(1)
		go func(master string) {
			defer wm.Done()
			Cmd(master, cmd)
		}(master)
	}
	for _, node := range s.Nodes {
		wn.Add(1)
		go func(node string) {
			defer wn.Done()
			Cmd(node, cmd)
		}(node)
	}

	wm.Wait()
	wn.Wait()
}
