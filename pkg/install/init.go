// Copyright © 2021 sealos.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package install

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"strings"

	"github.com/fanux/sealos/pkg/utils/versionutil"

	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/config"
	cert2 "github.com/fanux/sealos/pkg/utils/kubernetes/cert"
	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/utils/cni"

	v1 "github.com/fanux/sealos/pkg/types/v1alpha1"
	"github.com/fanux/sealos/pkg/utils/ssh"
)

//BuildInit is
func BuildInit() {
	v1.MasterIPs = iputils.ParseIPs(v1.MasterIPs)
	v1.NodeIPs = iputils.ParseIPs(v1.NodeIPs)
	// 所有master节点
	masters := v1.MasterIPs
	// 所有node节点
	nodes := v1.NodeIPs
	hosts := append(masters, nodes...)
	i := &SealosInstaller{
		Hosts:     hosts,
		Masters:   masters,
		Nodes:     nodes,
		APIServer: v1.APIServer,
	}
	i.CheckValid()
	i.Print()
	i.SendSealos()
	i.SendPackage()
	i.Print("CopyFiles")
	i.KubeadmConfigInstall()
	i.Print("CopyFiles", "KubeadmConfigInstall")
	i.GenerateCert()
	//生成kubeconfig的时候kubeadm的kubeconfig阶段会检查硬盘是否kubeconfig，有则跳过
	//不用kubeadm init加选项跳过[kubeconfig]的阶段
	i.CreateKubeconfig()

	i.InstallMaster0()
	i.Print("CopyFiles", "KubeadmConfigInstall", "InstallMaster0")
	if len(masters) > 1 {
		i.JoinMasters(i.Masters[1:])
		i.Print("CopyFiles", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters")
	}
	if len(nodes) > 0 {
		i.JoinNodes()
		i.Print("CopyFiles", "KubeadmConfigInstall", "InstallMaster0", "JoinMasters", "JoinNodes")
	}
	i.PrintFinish()
}

func (s *SealosInstaller) getCgroupDriverFromShell(h string) string {
	var output string
	if versionutil.For120(v1.Version) {
		cmd := ContainerdShell
		output = v1.SSHConfig.CmdToString(h, cmd, " ")
	} else {
		cmd := DockerShell
		output = v1.SSHConfig.CmdToString(h, cmd, " ")
	}
	output = strings.TrimSpace(output)
	logger.Info("cgroup driver is %s", output)
	return output
}

//KubeadmConfigInstall is
func (s *SealosInstaller) KubeadmConfigInstall() {
	var templateData string
	v1.CgroupDriver = s.getCgroupDriverFromShell(s.Masters[0])
	if v1.KubeadmFile == "" {
		templateData = string(config.Template())
	} else {
		fileData, err := ioutil.ReadFile(v1.KubeadmFile)
		defer func() {
			if r := recover(); r != nil {
				logger.Error("[globals]template file read failed:", err)
			}
		}()
		if err != nil {
			panic(1)
		}
		templateData = string(config.TemplateFromTemplateContent(string(fileData)))
	}
	cmd := fmt.Sprintf(`echo "%s" > /root/kubeadm-config.yaml`, templateData)
	//cmd := "echo \"" + templateData + "\" > /root/kubeadm-config.yaml"
	_ = v1.SSHConfig.CmdAsync(s.Masters[0], cmd)
	//读取模板数据
	kubeadm := config.KubeadmDataFromYaml(templateData)
	if kubeadm != nil {
		v1.DNSDomain = kubeadm.Networking.DNSDomain
		v1.APIServerCertSANs = kubeadm.APIServer.CertSANs
	} else {
		logger.Warn("decode certSANs from config failed, using default SANs")
		v1.APIServerCertSANs = getDefaultSANs()
	}
}

func getDefaultSANs() []string {
	var sans = []string{"127.0.0.1", v1.DefaultAPIServerDomain, v1.VIP}
	// 指定的certSANS不为空, 则添加进去
	if len(v1.CertSANS) != 0 {
		sans = append(sans, v1.CertSANS...)
	}
	for _, master := range v1.MasterIPs {
		sans = append(sans, iputils.IPFormat(master))
	}
	return sans
}

func (s *SealosInstaller) appendAPIServer() error {
	etcHostPath := "/etc/hosts"
	etcHostMap := fmt.Sprintf("%s %s", iputils.IPFormat(s.Masters[0]), v1.APIServer)
	file, err := os.OpenFile(etcHostPath, os.O_RDWR|os.O_APPEND, 0666)
	if err != nil {
		logger.Error("open %s file error %s", etcHostPath, err)
		os.Exit(1)
	}
	defer file.Close()
	reader := bufio.NewReader(file)
	for {
		str, err := reader.ReadString('\n')
		if strings.Contains(str, v1.APIServer) {
			logger.Info("local %s is already exists %s", etcHostPath, v1.APIServer)
			return nil
		}
		if err == io.EOF {
			break
		}
	}
	write := bufio.NewWriter(file)
	_, _ = write.WriteString(etcHostMap)
	return write.Flush()
}

func (s *SealosInstaller) GenerateCert() {
	//cert generator in sealos
	hostname := ssh.RemoteHostName(v1.SSHConfig, s.Masters[0])
	GenerateCert(v1.CertPath, v1.CertEtcdPath, v1.APIServerCertSANs, iputils.IPFormat(s.Masters[0]), hostname, v1.SvcCIDR, v1.DNSDomain)
	//copy all cert to master0
	//CertSA(kye,pub) + CertCA(key,crt)
	//s.sendNewCertAndKey(s.Masters)
	//s.sendCerts([]string{s.Masters[0]})
}

func (s *SealosInstaller) CreateKubeconfig() {
	hostname := ssh.RemoteHostName(v1.SSHConfig, s.Masters[0])

	certConfig := cert2.Config{
		Path:     v1.CertPath,
		BaseName: "ca",
	}

	controlPlaneEndpoint := fmt.Sprintf("https://%s:6443", v1.APIServer)

	err := cert2.CreateJoinControlPlaneKubeConfigFiles(v1.DefaultConfigPath,
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
	err := s.appendAPIServer()
	if err != nil {
		logger.Warn("append  %s %s to /etc/hosts err: %s", iputils.IPFormat(s.Masters[0]), v1.APIServer, err)
	}
	//master0 do sth
	cmd := fmt.Sprintf("grep -qF '%s %s' /etc/hosts || echo %s %s >> /etc/hosts", iputils.IPFormat(s.Masters[0]), v1.APIServer, iputils.IPFormat(s.Masters[0]), v1.APIServer)
	_ = v1.SSHConfig.CmdAsync(s.Masters[0], cmd)

	cmd = s.Command(v1.Version, InitMaster)

	output := v1.SSHConfig.Cmd(s.Masters[0], cmd)
	if output == nil {
		logger.Error("[%s] install kubernetes failed. please clean and uninstall.", s.Masters[0])
		os.Exit(1)
	}
	decodeOutput(output)

	cmd = `mkdir -p /root/.kube && cp /etc/kubernetes/admin.conf /root/.kube/config && chmod 600 /root/.kube/config`
	v1.SSHConfig.Cmd(s.Masters[0], cmd)

	if v1.WithoutCNI {
		logger.Info("--without-cni is true, so we not install calico or flannel, install it by yourself")
		return
	}
	//cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`
	var cniVersion string
	// can-reach is used by calico multi network , flannel has nothing to add. just Use it.
	if iputils.IsIpv4(v1.Interface) {
		v1.Interface = "can-reach=" + v1.Interface
	} else if !iputils.IsIpv4(v1.Interface) { //nolint:gofmt
		v1.Interface = "interface=" + v1.Interface
	}
	if v1.SSHConfig.IsFileExist(s.Masters[0], "/root/kube/Metadata") {
		var metajson string
		var tmpdata v1.Metadata
		metajson = v1.SSHConfig.CmdToString(s.Masters[0], "cat /root/kube/Metadata", "")
		err := json.Unmarshal([]byte(metajson), &tmpdata)
		if err != nil {
			logger.Warn("get metadata version err: ", err)
		} else {
			cniVersion = tmpdata.CniVersion
		}
	}
	netyaml := cni.NewCalico(cni.MetaData{
		Interface: v1.Interface,
		CIDR:      v1.PodCIDR,
		IPIP:      !v1.BGP,
		MTU:       v1.MTU,
		CniRepo:   v1.Repo,
		Version:   cniVersion,
	}).Manifests("")
	configYamlPath := filepath.Join(v1.DefaultConfigPath, "cni.yaml")
	logger.Debug("cni yaml path is : ", configYamlPath)
	_ = ioutil.WriteFile(configYamlPath, []byte(netyaml), 0755)
	v1.SSHConfig.Copy(s.Masters[0], configYamlPath, "/tmp/cni.yaml")
	v1.SSHConfig.Cmd(s.Masters[0], "kubectl apply -f /tmp/cni.yaml")
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
	if versionutil.ToIntAll(v1.Version) >= 1191 && versionutil.ToIntAll(v1.Version) <= 1192 {
		for _, v := range masters {
			ip := iputils.IPFormat(v)
			// use grep -qF if already use sed then skip....
			cmd := fmt.Sprintf(`grep -qF "%s" %s  && \
sed -i 's/%s/%s/' %s && \
sed -i 's/%s/%s/' %s`, v1.APIServer, KUBESCHEDULERCONFIGFILE,
				v1.APIServer, ip, KUBECONTROLLERCONFIGFILE,
				v1.APIServer, ip, KUBESCHEDULERCONFIGFILE)
			_ = v1.SSHConfig.CmdAsync(v, cmd)
		}
		to11911192 = true
	} else {
		to11911192 = false
	}
	return
}
