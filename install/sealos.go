package install

import (
	"fmt"
	"io/ioutil"
	"strings"
	"sync"
)

//Installer is
type Installer interface {
	KubeadmConfigInstall()
	InstallMaster0()
	JoinMasters()
	JoinNodes()
	CleanCluster()
	SendPackage(pkg string, url string)
}

//SealosInstaller is
type SealosInstaller struct {
	Masters         []string
	Nodes           []string
	VIP             string
	Version         string
	JoinToken       string
	TokenCaCertHash string
	CertificateKey  string
}

//BuildInstaller is
func BuildInstaller(masters []string, nodes []string, vip string, version string) Installer {
	return &SealosInstaller{
		Masters: masters,
		Nodes:   nodes,
		Version: version,
		VIP:     vip,
	}
}

//KubeadmConfigInstall is
func (s *SealosInstaller) KubeadmConfigInstall() {
	var templateData string
	if KubeadmFile == "" {
		templateData = string(Template(s.Masters, s.VIP, s.Version))
	} else {
		fileData, err := ioutil.ReadFile(KubeadmFile)
		if err != nil {
			fmt.Println("template file read failed:", err)
			panic(1)
		}
		templateData = string(fileData)
	}
	cmd := "echo \"" + templateData + "\" > ~/kubeadm-config.yaml"
	Cmd(s.Masters[0], cmd)
}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	cmd := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
	Cmd(s.Masters[0], cmd)

	cmd = "echo \"" + string(Template(s.Masters, s.VIP, s.Version)) + "\" > /root/kubeadm-config.yaml"
	Cmd(s.Masters[0], cmd)

	cmd = `kubeadm init --config=/root/kubeadm-config.yaml --experimental-upload-certs`
	output := Cmd(s.Masters[0], cmd)
	s.decodeOutput(output)

	cmd = `mkdir -p ~/.kube && cp /etc/kubernetes/admin.conf ~/.kube/config`
	output = Cmd(s.Masters[0], cmd)

	cmd = `kubectl apply -f /root/kube/conf/net/calico.yaml || true`
	output = Cmd(s.Masters[0], cmd)
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters() {
	cmd := fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s --experimental-control-plane --certificate-key %s", s.Masters[0], s.JoinToken, s.TokenCaCertHash, s.CertificateKey)

	for _, master := range s.Masters[1:] {
		cmdHosts := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
		Cmd(master, cmdHosts)
		Cmd(master, cmd)
		cmdHosts = fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, s.Masters[0], master)
		Cmd(master, cmdHosts)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	var wg sync.WaitGroup
	for _, master := range s.Masters {
		masters += fmt.Sprintf(" --master %s:6443", master)
	}

	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			cmdHosts := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.VIP)
			Cmd(node, cmdHosts)
			cmd := fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s", s.VIP, s.JoinToken, s.TokenCaCertHash)
			cmd += masters
			Cmd(node, cmd)
		}(node)
	}

	wg.Wait()
}

//CleanCluster is
func (s *SealosInstaller) CleanCluster() {
	cmd := fmt.Sprintf("kubeadm reset -f && rm -rf /var/etcd && rm -rf /var/lib/etcd")
	cmdHost := fmt.Sprintf("sed -i \"/apiserver.cluster.local/d\" /etc/hosts ")

	for _, master := range s.Masters {
		Cmd(master, cmd)
		Cmd(master, cmdHost)
	}

	var wg sync.WaitGroup
	for _, node := range s.Nodes {
		wg.Add(1)
		go func(node string) {
			defer wg.Done()
			Cmd(node, cmd)
			Cmd(node, cmdHost)
		}(node)
	}
	wg.Wait()
}

//decode output to join token  hash and key
func (s *SealosInstaller) decodeOutput(output []byte) {
	s0 := string(output)
	slice := strings.Split(s0, "kubeadm join")
	slice1 := strings.Split(slice[1], "Please note")
	fmt.Println("	join command is: ", slice1[0])
	s.decodeJoinCmd(slice1[0])
}

//  192.168.0.200:6443 --token 9vr73a.a8uxyaju799qwdjv --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 --experimental-control-plane --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07
func (s *SealosInstaller) decodeJoinCmd(cmd string) {
	stringSlice := strings.Split(cmd, " ")

	for i, r := range stringSlice {
		switch r {
		case "--token":
			s.JoinToken = stringSlice[i+1]
		case "--discovery-token-ca-cert-hash":
			s.TokenCaCertHash = stringSlice[i+1]
		case "--certificate-key":
			s.CertificateKey = stringSlice[i+1][:64]
		}
	}

	fmt.Println("	sealos config is: ", *s)
}
