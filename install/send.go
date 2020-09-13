package install

import (
	"fmt"
	"path"
)

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	pkg := path.Base(PkgUrl)
	kubeHook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && sh init.sh", pkg)
	deletekubectl := fmt.Sprintf("sed -i \"/%s/d\" /root/.bashrc ", "kubectl")
	completion := "echo 'command -v kubectl &>/dev/null && source <(kubectl completion bash)' >> /root/.bashrc && source /root/.bashrc"
	kubeHook = kubeHook + " && " + deletekubectl + " && " + completion
	PkgUrl = SendPackage(PkgUrl, s.Hosts, "/root", nil, &kubeHook)

	//send sealos
	sealos := FetchSealosAbsPath()
	beforeHook := "ps -ef |grep -v 'grep'|grep sealos >/dev/null || rm -rf /usr/bin/sealos"
	afterHook := "chmod a+x /usr/sbin/sealos"
	SendPackage(sealos, s.Hosts, "/usr/sbin", &beforeHook, &afterHook)
}
