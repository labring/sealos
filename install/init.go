package install

import (
	"fmt"
	"github.com/fanux/sealos/net"
	"github.com/wonderivan/logger"
	"io/ioutil"
	"os"
)

//BuildInit is
func BuildInit() {
	//hosts := append(Masters, Nodes...)
	// 所有master节点
	masters := ParseIPs(MasterIPs)
	// 所有node节点
	nodes := ParseIPs(NodeIPs)
	hosts := append(masters, nodes...)
	i := &SealosInstaller{
		Hosts:   hosts,
		Masters: masters,
		Nodes:   nodes,
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
		i.JoinMasters(i.Masters[1:])
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
	SSHConfig.Cmd(s.Masters[0], cmd)
}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	cmd := fmt.Sprintf("echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer)
	SSHConfig.Cmd(s.Masters[0], cmd)

	cmd = s.Command(Version, InitMaster)

	output := SSHConfig.Cmd(s.Masters[0], cmd)
	if output == nil {
		logger.Error("[%s]kubernetes install is error.please clean and uninstall.", s.Masters[0])
		os.Exit(1)
	}
	decodeOutput(output)

	cmd = `mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config`
	output = SSHConfig.Cmd(s.Masters[0], cmd)

	if WithoutCNI {
		logger.Info("--without-cni is true, so we not install calico or flannel, install it by yourself")
		return
	}
	//cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`
	netyaml := net.NewNetwork(Network, net.MetaData{
		Interface: Interface,
		CIDR: PodCIDR,
		IPIP:IPIP,
		MTU: MTU,
	}).Manifests("")

	logger.Info("calico yaml is : \n", netyaml)
	cmd = fmt.Sprintf(`echo '%s' | kubectl apply -f -`, netyaml)
	output = SSHConfig.Cmd(s.Masters[0], cmd)
}
