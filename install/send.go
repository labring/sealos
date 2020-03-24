package install

import (
	"fmt"
	"path"
)

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	pkg := path.Base(PkgUrl)
	hook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh", pkg)
	SendPackage(PkgUrl, s.Hosts, "/root", hook)
}
