package install

import (
	"fmt"
	"path"
)

const (
	InitShellPath   = "/root/kube/shell"
)

//SendPackage is
func (s *SealosInstaller) SendPackage() {
	pkg := path.Base(PkgUrl)
	// rm old sealos in package avoid old version problem. if sealos not exist in package then skip rm
	// send binaries to nodes.
	kubeHook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/bin && rm -f sealos && cp ./* /usr/bin && rm -f ../shell/init.sh", pkg)
	deletekubectl := `sed -i '/kubectl/d;/sealos/d' /root/.bashrc `
	completion := "echo 'command -v kubectl &>/dev/null && source <(kubectl completion bash)' >> /root/.bashrc && echo 'command -v sealos &>/dev/null && source <(sealos completion bash)' >> /root/.bashrc && source /root/.bashrc"
	kubeHook = kubeHook + " && " + deletekubectl + " && " + completion
	PkgUrl = SendPackage(PkgUrl, s.Hosts, "/root", nil, &kubeHook)

	s.LoadImages()
}

// SendSealos is send the exec sealos to /usr/bin/sealos
func (s *SealosInstaller) SendSealos() {
	// send sealos first to avoid old version
	sealos := FetchSealosAbsPath()
	beforeHook := "ps -ef |grep -v 'grep'|grep sealos >/dev/null || rm -rf /usr/bin/sealos"
	afterHook := "chmod a+x /usr/bin/sealos"
	SendPackage(sealos, s.Hosts, "/usr/bin", &beforeHook, &afterHook)
}

// SendPackage is send new pkg to all nodes.
func (u *SealosUpgrade) SendPackage() {
	all := append(u.Masters, u.Nodes...)
	pkg := path.Base(u.NewPkgUrl)
	// rm old sealos in package avoid old version problem. if sealos not exist in package then skip rm
	kubeHook := fmt.Sprintf("cd /root && rm -rf kube && tar zxvf %s  && cd /root/kube/shell && rm -f ../bin/sealos  && cp -f ../bin/* /usr/bin/ ", pkg)
	PkgUrl = SendPackage(pkg, all, "/root", nil, &kubeHook)

	u.LoadImages()
}