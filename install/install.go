package install

import "fmt"

//BuildJoin is
func BuildInstall(name string) {
	hosts := append(Masters, Nodes...)
	i := &SealosInstaller{
		Hosts: hosts,
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
	Cmd(Masters[0], kubeCmd)
}
