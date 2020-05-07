package install

import (
	"fmt"
	"path"
	"sync"
)

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	//pkg := path.Base(PkgUrl)
	//kubeHook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh", pkg)
	PkgUrl = SendPackage(PkgUrl, s.Hosts, "/root", nil, nil)

	//send sealos
	sealos := FetchSealosAbsPath()
	beforeHook := "ps -ef |grep -v 'grep'|grep sealos >/dev/null || rm -rf /usr/bin/sealos"
	afterHook := "chmod a+x /usr/bin/sealos"
	SendPackage(sealos, s.Hosts, "/usr/bin", &beforeHook, &afterHook)
}

func (s *SealosInstaller)LoadImages() {
	pkg := path.Base(PkgUrl)
	cmd := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh", pkg)
	var w sync.WaitGroup
	for _,host := range s.Hosts {
		w.Add(1)
		go func(host string) {
			SSHConfig.CmdAsync(host,cmd)
			w.Done()
		}(host)
	}
	w.Wait()
}
