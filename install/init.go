package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"io/ioutil"
)

//BuildInit is
func BuildInit(masters []string, nodes []string, vip, pkgUrl string) Init {
	hosts := append(masters, nodes...)
	return &SealosInstaller{
		Masters: masters,
		Nodes:   nodes,
		VIP:     vip,
		PkgUrl:  pkgUrl,
		Hosts:   hosts,
	}
}

//KubeadmConfigInstall is
func (s *SealosInstaller) KubeadmConfigInstall() {
	var templateData string
	if KubeadmFile == "" {
		templateData = string(Template(s.Masters, s.VIP, Version))
	} else {
		fileData, err := ioutil.ReadFile(KubeadmFile)
		if err != nil {
			logger.Error("template file read failed:", err)
			panic(1)
		}
		templateData = string(TemplateFromTemplateContent(s.Masters, s.VIP, Version, string(fileData)))
	}
	cmd := "echo \"" + templateData + "\" > /root/kubeadm-config.yaml"
	Cmd(s.Masters[0], cmd)
}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	cmd := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
	Cmd(s.Masters[0], cmd)

	cmd = `kubeadm init --config=/root/kubeadm-config.yaml --experimental-upload-certs`
	output := Cmd(s.Masters[0], cmd)
	decodeOutput(output)

	cmd = `mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config`
	output = Cmd(s.Masters[0], cmd)

	cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`
	output = Cmd(s.Masters[0], cmd)
}
