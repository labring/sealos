package install

import "fmt"

//BuildJoin is
func BuildInstall(masters []string, nodes []string, pkgUrl, name string) {
	hosts := append(masters, nodes...)
	i := &SealosInstaller{
		Masters: masters,
		Nodes:   nodes,
		PkgUrl:  pkgUrl,
		Hosts:   hosts,
	}
	i.CheckValid()
	i.SendPackage(name)
	i.KubeApply(name)
}

func (s *SealosInstaller) KubeApply(name string) {
	args := "-f"
	if Kustomize {
		args = "-k"
	}
	kubeCmd := fmt.Sprintf("cd /root/%s/conf && kubectl apply %s .", name, args)
	Cmd(s.Masters[0], kubeCmd)
}
