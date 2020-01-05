package install

import (
	"fmt"
	"github.com/wonderivan/logger"
	"io/ioutil"
	"os"
)

//BuildInit is
func BuildInit() {
	//hosts := append(Masters, Nodes...)
	// 所有master节点
	masters := append(Masters, ParseIPs(MasterIPs)...)
	// 所有node节点
	nodes := append(Nodes, ParseIPs(NodeIPs)...)
	hosts := append(masters, nodes...)
	i := &SealosInstaller{
		Hosts: hosts,
		Masters: masters,
		Nodes: nodes,
	}
	i.CheckValid()
	i.Print()
	i.SendPackage("kube")
	i.Print("SendPackage")
	i.KubeadmConfigInstall()
	i.Print("SendPackage", "KubeadmConfigInstall")
	i.InstallMaster0()
	i.Print("SendPackage", "KubeadmConfigInstall", "InstallMaster0")
	if len(masters) > 1 {
		i.JoinMasters()
		i.Print("SendPackage", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters")
	}
	if len(nodes) > 0 {
		i.JoinNodes()
		i.Print("SendPackage", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters", "JoinNodes")
	}
	i.PrintFinish()
}

//KubeadmConfigInstall is
func (s *SealosInstaller) KubeadmConfigInstall() {
	var templateData string
	if KubeadmFile == "" {
		templateData = string(Template())
	} else {
		fileData, err := ioutil.ReadFile(KubeadmFile)
		defer func() {
			if r := recover(); r != nil {
				logger.Error("[globals]template file read failed:", err)
			}
		}()
		if err != nil {
			panic(1)
		}
		templateData = string(TemplateFromTemplateContent(string(fileData)))
	}
	cmd := "echo \"" + templateData + "\" > /root/kubeadm-config.yaml"
	Cmd(s.Masters[0], cmd)
}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	cmd := fmt.Sprintf("echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer)
	Cmd(s.Masters[0], cmd)

	cmd = s.Command(Version, InitMaster)

	output := Cmd(s.Masters[0], cmd)
	if output == nil {
		logger.Error("[%s]kubernetes install is error.please clean and uninstall.", s.Masters[0])
		os.Exit(1)
	}
	decodeOutput(output)

	cmd = `mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config`
	output = Cmd(s.Masters[0], cmd)

	cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`
	output = Cmd(s.Masters[0], cmd)
}
