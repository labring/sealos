package install

import (
	"bytes"
	"crypto/tls"
	"fmt"
	"html/template"
	"net"
	"net/http"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"github.com/pkg/sftp"
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
)

//username
var (
	User        string
	Passwd      string
	KubeadmFile string
	Version     string
)

const oneMBByte = 1024 * 1024

//ReturnCmd is
func ReturnCmd(host, port, cmd string) string {
	session, _ := Connect(User, Passwd, host, port)
	defer session.Close()
	b, _ := session.CombinedOutput(cmd)
	return string(b)
}

//GetFileSize is
func GetFileSize(url string) int {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}

	client := &http.Client{Transport: tr}
	resp, err := client.Get(url)
	if err != nil {
		panic(err)
	}
	resp.Body.Close()
	return int(resp.ContentLength)
}
func WatchFileSize(host, port, filename string, size int) {
	t := time.NewTicker(3 * time.Second) //every 3s check file
	defer t.Stop()
	for {
		select {
		case <-t.C:
			length := ReturnCmd(host, port, "ls -l "+filename+" | awk '{print $5}'")
			length = strings.Replace(length, "\n", "", -1)
			length = strings.Replace(length, "\r", "", -1)
			lengthByte, _ := strconv.Atoi(length)
			if lengthByte == size {
				t.Stop()
			}
			lengthFloat := float64(lengthByte)
			value, _ := strconv.ParseFloat(fmt.Sprintf("%.2f", lengthFloat/oneMBByte), 64)
			logger.Alert("transfer total size is:", value, "MB")
		}
	}
}

//Cmd is
func Cmd(host, port string, cmd string) []byte {
	logger.Info(host, "    ", cmd)
	session, err := Connect(User, Passwd, host, port)
	if err != nil {
		logger.Error("	Error create ssh session failed", err)
		panic(1)
	}
	defer session.Close()

	b, err := session.CombinedOutput(cmd)
	logger.Debug("command result is:", string(b))
	if err != nil {
		logger.Error("	Error exec command failed", err)
		panic(1)
	}
	return b
}

func RemoteFilExist(host, port, remoteFilePath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	remoteFileName := path.Base(remoteFilePath) // aa
	remoteFileDirName := path.Dir(remoteFilePath)
	remoteFileCommand := fmt.Sprintf("ls -l %s | grep %s | wc -l", remoteFileDirName, remoteFileName)
	data := bytes.Replace(Cmd(host, port, remoteFileCommand), []byte("\r"), []byte(""), -1)
	data = bytes.Replace(data, []byte("\n"), []byte(""), -1)

	count, err := strconv.Atoi(string(data))
	if err != nil {
		logger.Error("RemoteFilExist:", err)
		panic(1)
	}
	if count == 0 {
		return false
	} else {
		return true
	}
}

//Copy is
func Copy(host, port, localFilePath, remoteFilePath string) {
	sftpClient, err := SftpConnect(User, Passwd, host, port)
	if err != nil {
		logger.Error("scpCopy:", err)
		panic(1)
	}
	defer sftpClient.Close()
	srcFile, err := os.Open(localFilePath)
	if err != nil {
		logger.Error("scpCopy:", err)
		panic(1)
	}
	defer srcFile.Close()

	dstFile, err := sftpClient.Create(remoteFilePath)
	if err != nil {
		logger.Error("scpCopy:", err)
		panic(1)
	}
	defer dstFile.Close()
	buf := make([]byte, 100*oneMBByte) //100mb
	totalMB := 0
	for {
		n, _ := srcFile.Read(buf)
		if n == 0 {
			break
		}
		length, _ := dstFile.Write(buf[0:n])
		totalMB += length / oneMBByte
		logger.Alert("transfer total size is:", totalMB, "MB")
	}
}

//Connect is
func Connect(user, passwd, host, port string) (*ssh.Session, error) {
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

	addr := fmt.Sprintf("%s:%s", host, port)
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

//SftpConnect  is
func SftpConnect(user, password, host, port string) (*sftp.Client, error) {
	var (
		auth         []ssh.AuthMethod
		addr         string
		clientConfig *ssh.ClientConfig
		sshClient    *ssh.Client
		sftpClient   *sftp.Client
		err          error
	)
	// get auth method
	auth = make([]ssh.AuthMethod, 0)
	auth = append(auth, ssh.Password(password))

	clientConfig = &ssh.ClientConfig{
		User:    user,
		Auth:    auth,
		Timeout: 30 * time.Second,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
	}

	// connet to ssh
	addr = fmt.Sprintf("%s:%s", host, port)

	if sshClient, err = ssh.Dial("tcp", addr, clientConfig); err != nil {
		return nil, err
	}

	// create sftp client
	if sftpClient, err = sftp.NewClient(sshClient); err != nil {
		return nil, err
	}

	return sftpClient, nil
}

//Template is
func Template(masters []string, vip string, version string) []byte {
	var templateText = string(`apiVersion: kubeadm.k8s.io/v1beta1
kind: ClusterConfiguration
kubernetesVersion: {{.Version}}
controlPlaneEndpoint: "apiserver.cluster.local:6443"
networking:
  podSubnet: 100.64.0.0/10
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
		logger.Error("template parse failed:", err)
		panic(1)
	}
	var envMap = make(map[string]interface{})
	envMap["VIP"] = vip
	envMap["Masters"] = masters
	envMap["Version"] = version
	var buffer bytes.Buffer
	_ = tmpl.Execute(&buffer, envMap)
	return buffer.Bytes()
}

func HostAndPortSpilt(hosts interface{}) ([]string, []string) {
	var rhosts, rports []string
	switch vhosts := hosts.(type) {
	case string:
		h, p := priHostSpilt(vhosts)
		rhosts = append(rhosts, h)
		rports = append(rports, p)
	case []string:
		for _, v := range vhosts {
			h, p := priHostSpilt(v)
			rhosts = append(rhosts, h)
			rports = append(rports, p)
		}
	}
	return rhosts, rports
}

func priHostSpilt(vhosts string) (string, string) {
	spiltArr := strings.Split(vhosts, ":")
	var rhosts, rports string
	if len(spiltArr) == 1 {
		rhosts = vhosts
		rports = "22"
	} else {
		rhosts = spiltArr[0]
		rports = spiltArr[1]
	}
	return rhosts, rports
}
