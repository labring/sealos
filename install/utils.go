package install

import (
	"bytes"
	"fmt"
	"gopkg.in/yaml.v2"
	"html/template"
	"io/ioutil"
	"net"
	"time"

	"golang.org/x/crypto/ssh"
)

//username
var (
	User        string
	Passwd      string
	KubeadmFile string
)

//Cmd is
func Cmd(host string, cmd string) []byte {
	fmt.Println("\n\n exec command")
	fmt.Println(host, "    ", cmd)
	session, err := Connect(User, Passwd, host)
	if err != nil {
		fmt.Println("	Error create ssh session failed", err)
		panic(1)
		return []byte{}
	}
	defer session.Close()

	b, err := session.CombinedOutput(cmd)
	fmt.Printf("%s\n\n", b)
	if err != nil {
		fmt.Println("	Error exec command failed", err)
		panic(1)
		return []byte{}
	}
	return b
}

//Connect is
func Connect(user, passwd, host string) (*ssh.Session, error) {
	auth := []ssh.AuthMethod{ssh.Password(passwd)}
	config := ssh.Config{
		Ciphers: []string{"aes128-ctr", "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com", "arcfour256", "arcfour128", "aes128-cbc", "3des-cbc", "aes192-cbc", "aes256-cbc"},
	}

	clientConfig := &ssh.ClientConfig{
		User:    user,
		Auth:    auth,
		Timeout: time.Duration(5) * time.Minute,
		Config:  config,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
	}

	addr := fmt.Sprintf("%s:22", host)
	client, err := ssh.Dial("tcp", addr, clientConfig)
	if err != nil {
		return nil, err
	}

	session, err := client.NewSession()
	if err != nil {
		return nil, err
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          0,     // disable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}

	if err := session.RequestPty("xterm", 80, 40, modes); err != nil {
		return nil, err
	}

	return session, nil
}

func LoadMasterAndVIP() (master []string, vip string) {
	var data map[interface{}]interface{}
	kubeadmData, err := ioutil.ReadFile(KubeadmFile)
	if err != nil {
		fmt.Println("file read failed:", err)
		panic(1)
	}
	err = yaml.Unmarshal(kubeadmData, &data)
	if err != nil {
		fmt.Println("yaml read failed:", err)
		panic(1)
	}
	return nil, ""
}

//Template is
func Template(masters []string, vip string) []byte {
	var templateText = string(`apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: v1.14.0
controlPlaneEndpoint: "apiserver.cluster.local:6443"
apiServer:
        certSANs:
        - 127.0.0.1
        - apiserver.cluster.local
        {{range .Masters -}}
        - {{.}}
        {{end -}}
        - {{.VIP}}
---
apiVersion: kubeproxy.config.k8s.io/v1alpha1
kind: KubeProxyConfiguration
mode: "ipvs"
ipvs:
        excludeCIDRs: 
        - "{{.VIP}}/32"`)
	tmpl, err := template.New("text").Parse(templateText)
	if err != nil {
		fmt.Println("template parse failed:", err)
		panic(1)
	}
	var envMap = make(map[string]interface{})
	envMap["VIP"] = vip
	envMap["Masters"] = masters
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}
