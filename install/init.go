package install

import (
	"bufio"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"strings"

	"github.com/fanux/sealos/k8s"

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
		Hosts:     hosts,
		Masters:   masters,
		Nodes:     nodes,
		Network:   Network,
		ApiServer: ApiServer,
	}
	i.CheckValid()
	i.Print()
	i.SendSealos()
	i.SendPackage()
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
	cmd := fmt.Sprintf(`echo "%s" > /root/kubeadm-config.yaml`, templateData)
	//cmd := "echo \"" + templateData + "\" > /root/kubeadm-config.yaml"
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

func (s *SealosInstaller) appendApiServer() error {
	etcHostPath := "/etc/hosts"
	etcHostMap := fmt.Sprintf("%s %s", IpFormat(s.Masters[0]), ApiServer)
	file, err := os.OpenFile(etcHostPath, os.O_RDWR|os.O_APPEND, 0666)
	if err != nil {
		os.Exit(1)
	}
	defer file.Close()
	reader := bufio.NewReader(file)
	for {
		str, err := reader.ReadString('\n')
		if strings.Contains(str, ApiServer) {
			logger.Info("local %s is already exists %s", etcHostPath, ApiServer)
			return nil
		}
		if err == io.EOF {
			break
		}
	}
	write := bufio.NewWriter(file)
	write.WriteString(etcHostMap)
	return write.Flush()
}

func (s *SealosInstaller) GenerateCert() {
	//cert generator in sealos
	hostname := GetRemoteHostName(s.Masters[0])
	cert.GenerateCert(CertPath, CertEtcdPath, ApiServerCertSANs, IpFormat(s.Masters[0]), hostname, SvcCIDR, DnsDomain)
	//copy all cert to master0
	//CertSA(kye,pub) + CertCA(key,crt)
	//s.sendNewCertAndKey(s.Masters)
	//s.sendCerts([]string{s.Masters[0]})
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
	s.SendKubeConfigs([]string{s.Masters[0]})
	s.sendNewCertAndKey([]string{s.Masters[0]})

	// remote server run sealos init . it can not reach apiserver.cluster.local , should add masterip apiserver.cluster.local to /etc/hosts
	err := s.appendApiServer()
	if err != nil {
		logger.Warn("append  %s %s to /etc/hosts err: %s", IpFormat(s.Masters[0]), ApiServer, err)
	}
	//master0 do sth
	cmd := fmt.Sprintf("grep -qF '%s %s' /etc/hosts || echo %s %s >> /etc/hosts", IpFormat(s.Masters[0]), ApiServer, IpFormat(s.Masters[0]), ApiServer)
	_ = SSHConfig.CmdAsync(s.Masters[0], cmd)

	cmd = s.Command(Version, InitMaster)

	output := SSHConfig.Cmd(s.Masters[0], cmd)
	if output == nil {
		logger.Error("[%s] install kubernetes failed. please clean and uninstall.", s.Masters[0])
		os.Exit(1)
	}
	decodeOutput(output)

	cmd = `mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config && chmod 600 /root/.kube/config`
	output = SSHConfig.Cmd(s.Masters[0], cmd)

	if WithoutCNI {
		logger.Info("--without-cni is true, so we not install calico or flannel, install it by yourself")
		return
	}
	//cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`

	// can-reach is used by calico multi network , flannel has nothing to add. just Use it.
	if k8s.IsIpv4(Interface) && Network == "calico" {
		Interface = "can-reach=" + Interface
	} else {
		Interface = "interface=" + Interface
	}

	netyaml := net.NewNetwork(Network, net.MetaData{
		Interface:      Interface,
		CIDR:           PodCIDR,
		IPIP:           IPIP,
		MTU:            MTU,
		CniRepo:        Repo,
		K8sServiceHost: s.ApiServer,
	}).Manifests("")

	cmd = fmt.Sprintf(`echo '%s' | kubectl apply -f -`, netyaml)
	output = SSHConfig.Cmd(s.Masters[0], cmd)
}

//SendKubeConfigs
func (s *SealosInstaller) SendKubeConfigs(masters []string) {
	s.sendKubeConfigFile(masters, "kubelet.conf")
	s.sendKubeConfigFile(masters, "admin.conf")
	s.sendKubeConfigFile(masters, "controller-manager.conf")
	s.sendKubeConfigFile(masters, "scheduler.conf")

	if s.to11911192(masters) {
		logger.Info("set 1191 1192 config")
	}
}

func (s *SealosInstaller) SendJoinMasterKubeConfigs(masters []string) {
	s.sendKubeConfigFile(masters, "admin.conf")
	s.sendKubeConfigFile(masters, "controller-manager.conf")
	s.sendKubeConfigFile(masters, "scheduler.conf")
	if s.to11911192(masters) {
		logger.Info("set 1191 1192 config")
	}
}

func (s *SealosInstaller) to11911192(masters []string) (to11911192 bool) {
	// fix > 1.19.1 kube-controller-manager and kube-scheduler use the LocalAPIEndpoint instead of the ControlPlaneEndpoint.
	if VersionToIntAll(Version) >= 1191 && VersionToIntAll(Version) <= 1192 {
		for _, v := range masters {
			ip := IpFormat(v)
			// use grep -qF if already use sed then skip....
			cmd := fmt.Sprintf(`grep -qF "apiserver.cluster.local" %s  && \
sed -i 's/apiserver.cluster.local/%s/' %s && \
sed -i 's/apiserver.cluster.local/%s/' %s`, KUBESCHEDULERCONFIGFILE, ip, KUBECONTROLLERCONFIGFILE, ip, KUBESCHEDULERCONFIGFILE)
			SSHConfig.CmdAsync(v, cmd)
		}
		to11911192 = true
	} else {
		to11911192 = false
	}
	return
}
