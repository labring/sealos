package init

import (
	"fmt"
	"strings"
)

//Installer is
type Installer interface {
	InstallMaster0()
	JoinMasters()
	JoinNodes()
}

//SealosInstaller is
type SealosInstaller struct {
	User   string
	Passwd string

	Masters []string
	Nodes   []string

	JoinToken       string
	TokenCaCertHash string
	CertificateKey  string
}

//BuildInstaller is
func BuildInstaller(user string, passwd string, masters []string, nodes []string) Installer {
	return &SealosInstaller{
		User:    user,
		Passwd:  passwd,
		Masters: masters,
		Nodes:   nodes,
	}
}

//InstallMaster0 is
func (s *SealosInstaller) InstallMaster0() {
	cmd := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
	Cmd(s.Masters[0], cmd)

	cmd = `kubeadm init --config=kubeadm-config.yaml --experimental-upload-certs`
	output := Cmd(s.Masters[0], cmd)
	s.decodeOutput(output)

	cmd = `mkdir ~/.kube && cp /etc/kubernetes/admin.conf ~/.kube/config`
	output = Cmd(s.Masters[0], cmd)

	cmd = `kubectl apply -f net/calico.yaml`
	output = Cmd(s.Masters[0], cmd)
}

//JoinMasters is
func (s *SealosInstaller) JoinMasters() {
	cmd := fmt.Sprintf("kubeadm join %s:6443 --token %s --discovery-token-ca-cert-hash %s --experimental-control-plane --certificate-key %s", s.Masters[0], s.JoinToken, s.TokenCaCertHash, s.CertificateKey)

	for _, master := range s.Masters[1:] {
		cmdHosts := fmt.Sprintf("echo %s apiserver.cluster.local >> /etc/hosts", s.Masters[0])
		Cmd(master, cmdHosts)
		Cmd(master, cmd)
		cmdHosts := fmt.Sprintf(`sed "s/%s/%s/g" -i /etc/hosts`, s.Masters[0], master)
		Cmd(master, cmdHosts)
	}
}

//JoinNodes is
func (s *SealosInstaller) JoinNodes() {
	var masters string
	for _, master := range s.Masters {
		masters += fmt.Sprintf("--master %s:6443", master)
	}

	for _, node := range s.Nodes {
		go func(node string) {
			cmdHosts := fmt.Sprintf("echo 10.103.97.2 apiserver.cluster.local >> /etc/hosts")
			Cmd(node, cmdHosts)
			cmd := fmt.Sprintf("kubeadm join 10.103.97.2:6443 --token %s --discovery-token-ca-cert-hash %s", s.JoinToken, s.TokenCaCertHash)
			cmd += masters
			Cmd(node, cmd)
		}(node)
	}
}

//decode output to join token  hash and key
func (s *SealosInstaller) decodeOutput(output []byte) {
	s := string(output)
	slice := strings.Split(s, "kubeadm join")
	slice1 := strings.Split(slice[1], "\n")
	slice1[0] += "kubeadm join "
	fmt.Println("	join command is: %s", slice1[0])
	s.decodeJoinCmd(slice1[0])
}

//  kubeadm join 192.168.0.200:6443 --token 9vr73a.a8uxyaju799qwdjv --discovery-token-ca-cert-hash sha256:7c2e69131a36ae2a042a339b33381c6d0d43887e2de83720eff5359e26aec866 --experimental-control-plane --certificate-key f8902e114ef118304e561c3ecd4d0b543adc226b7a07f675f56564185ffe0c07
func (s *SealosInstaller) decodeJoinCmd(cmd string) {
	stringSlice := strings.Split(cmd, " ")
	if len(stringSlice) == 10 {
		s.JoinToken = stringSlice[4]
		s.TokenCaCertHash = stringSlice[6]
		s.CertificateKey = stringSlice[9]

		fmt.Println("sealos config %v", *s)
	} else {
		fmt.Println("	Error decode join command")
	}
}
