package install

import (
	"fmt"
	"io/ioutil"
	"os"

	"github.com/fanux/sealos/cert"
	"github.com/fanux/sealos/net"
	"github.com/wonderivan/logger"
)

//BuildInit is
func BuildInit() {
	MasterIPs = ParseIPs(MasterIPs)
	NodeIPs = ParseIPs(NodeIPs)
	// 所有master节点
	masters := MasterIPs
	// 所有node节点
	nodes := NodeIPs
	hosts := append(masters, nodes...)
	i := &SealosInstaller{
		Hosts:   hosts,
		Masters: masters,
		Nodes:   nodes,
	}
	i.CheckValid()
	i.Print()
	i.SendPackage()
	i.CheckRoute()
	i.Print("SendPackage")
	i.KubeadmConfigInstall()
	i.Print("SendPackage", "KubeadmConfigInstall")
	i.GenerateCert()
	//生成kubeconfig的时候kubeadm的kubeconfig阶段会检查硬盘是否kubeconfig，有则跳过
	//不用kubeadm init加选项跳过[kubeconfig]的阶段
	i.CreateKubeconfig()

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
	_ = SSHConfig.CmdAsync(s.Masters[0], cmd)
	//读取模板数据
	kubeadm := KubeadmDataFromYaml(templateData)
	if kubeadm != nil {
		DnsDomain = kubeadm.Networking.DnsDomain
		ApiServerCertSANs = kubeadm.ApiServer.CertSANs
	} else {
		logger.Warn("decode certSANs from config failed, using default SANs")
		ApiServerCertSANs = getDefaultSANs()
	}
}

func getDefaultSANs() []string {
	var sans = []string{"127.0.0.1", "apiserver.cluster.local", VIP}
	// 指定的certSANS不为空, 则添加进去
	if len(CertSANS) != 0 {
		sans = append(sans, CertSANS...)
	}
	for _, master := range MasterIPs {
		sans = append(sans, IpFormat(master))
	}
	return sans
}

func (s *SealosInstaller) GenerateCert() {
	//cert generator in sealos
	hostname := GetRemoteHostName(s.Masters[0])
	cert.GenerateCert(CertPath, CertEtcdPath, ApiServerCertSANs, IpFormat(s.Masters[0]), hostname, SvcCIDR, DnsDomain)
	//copy all cert to master0
	//CertSA(kye,pub) + CertCA(key,crt)
	s.sendCaAndKey(s.Masters)
	s.sendCerts([]string{s.Masters[0]})
}

func (s *SealosInstaller) CreateKubeconfig() {
	hostname := GetRemoteHostName(s.Masters[0])

	certConfig := cert.Config{
		Path:     CertPath,
		BaseName: "ca",
	}

	controlPlaneEndpoint := fmt.Sprintf("https://%s:6443", ApiServer)

	err := cert.CreateJoinControlPlaneKubeConfigFiles(cert.SealosConfigDir,
		certConfig, hostname, controlPlaneEndpoint, "kubernetes")
	if err != nil {
		logger.Error("generator kubeconfig failed %s", err)
		os.Exit(-1)
	}

}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	s.SendKubeConfigs(s.Masters, true)

	//master0 do sth
	cmd := fmt.Sprintf("grep -qF '%s %s' /etc/hosts || echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer, IpFormat(s.Masters[0]), ApiServer)
	_ = SSHConfig.CmdAsync(s.Masters[0], cmd)

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
		CIDR:      PodCIDR,
		IPIP:      IPIP,
		MTU:       MTU,
	}).Manifests("")

	cmd = fmt.Sprintf(`echo '%s' | kubectl apply -f -`, netyaml)
	output = SSHConfig.Cmd(s.Masters[0], cmd)
}

//SendKubeConfigs
func (s *SealosInstaller) SendKubeConfigs(masters []string, isMaster0 bool) {
	if isMaster0 {
		SendPackage(cert.SealosConfigDir+"/kubelet.conf", []string{masters[0]}, cert.KubernetesDir, nil, nil)
	}

	SendPackage(cert.SealosConfigDir+"/admin.conf", masters, cert.KubernetesDir, nil, nil)
	SendPackage(cert.SealosConfigDir+"/controller-manager.conf", masters, cert.KubernetesDir, nil, nil)
	SendPackage(cert.SealosConfigDir+"/scheduler.conf", masters, cert.KubernetesDir, nil, nil)
}
