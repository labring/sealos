package install

import (
	"fmt"
	"path"
)

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	pkg := path.Base(PkgUrl)
	kubeHook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh", pkg)
	PkgUrl = SendPackage(PkgUrl, s.Hosts, "/root", nil, &kubeHook)

	//send sealos
	sealos := FetchSealosAbsPath()
	beforeHook := "ps -ef |grep -v 'grep'|grep sealos >/dev/null || rm -rf /usr/bin/sealos"
	afterHook := "chmod a+x /usr/bin/sealos"
	SendPackage(sealos, s.Hosts, "/usr/bin", &beforeHook, &afterHook)
}
