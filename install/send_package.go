package install

import (
	"fmt"
	"sync"
)

//SendPackage is
func (s *SealosInstaller) SendPackage(pkg string, url string, localPkg bool) {
	if pkg == "" {
		return
	}
	localCmd := fmt.Sprintf("cd /root && tar zxvf %s && cd /root/kube/shell && sh init.sh", pkg)
	kubeLocal := fmt.Sprintf("/root/%s", pkg)
	remoteCmd := fmt.Sprintf("cd /root &&  wget %s && tar zxvf %s && cd /root/kube/shell && sh init.sh", url, pkg)
	var wm sync.WaitGroup
	var wn sync.WaitGroup
	for _, master := range s.Masters {
		wm.Add(1)
		go func(master string) {
			defer wm.Done()
			if localPkg {
				Copy(master, kubeLocal, kubeLocal)
				Cmd(master, localCmd)
			} else {
				if url != "" {
					Cmd(master, remoteCmd)
				} else {
					Cmd(master, localCmd)
				}
			}

		}(master)
	}
	for _, node := range s.Nodes {
		wn.Add(1)
		go func(node string) {
			defer wn.Done()
			if localPkg {
				Copy(node, kubeLocal, kubeLocal)
				Cmd(node, localCmd)
			} else {
				if url != "" {
					Cmd(node, remoteCmd)
				} else {
					Cmd(node, localCmd)
				}
			}
		}(node)
	}

	wm.Wait()
	wn.Wait()
}
