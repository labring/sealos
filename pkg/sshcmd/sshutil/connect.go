package sshutil

import (
	"fmt"
	"github.com/wonderivan/logger"
	"golang.org/x/crypto/ssh"
	"io/ioutil"
	"net"
	"os"
	"strings"
	"time"
)

/**
这里主要是做连接ssh操作的
*/
func (ss *SSH) connect(host string) (*ssh.Client, error) {
	auth := ss.sshAuthMethod(ss.Password, ss.PkFile, ss.PkPassword)
	config := ssh.Config{
		Ciphers: []string{"aes128-ctr", "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com", "arcfour256", "arcfour128", "aes128-cbc", "3des-cbc", "aes192-cbc", "aes256-cbc"},
	}
	DefaultTimeout := time.Duration(1) * time.Minute
	if ss.Timeout == nil {
		ss.Timeout = &DefaultTimeout
	}
	clientConfig := &ssh.ClientConfig{
		User:    ss.User,
		Auth:    auth,
		Timeout: *ss.Timeout,
		Config:  config,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
	}

	addr := ss.addrReformat(host)
	return ssh.Dial("tcp", addr, clientConfig)
}

func (ss *SSH) Connect(host string) (*ssh.Session, error) {
	client, err := ss.connect(host)
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

func (ss *SSH) sshAuthMethod(passwd, pkFile, pkPasswd string) (auth []ssh.AuthMethod) {
	// pkfile存在， 就进行密钥验证， 如果不存在，则跳过密钥验证。
	if fileExist(pkFile) {
		am, err := ss.sshPrivateKeyMethod(pkFile, pkPasswd)
		// 获取到密钥验证就添加， 没获取到就直接跳过。
		if err == nil {
			auth = append(auth, am)
		}
	}
	// 密码不为空， 则添加密码验证。
	if passwd != "" {
		auth = append(auth, ss.sshPasswordMethod(passwd))
	}

	return auth
}

func fileExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil || os.IsExist(err)
}

// 使用 pk认证， pk路径为 "/root/.ssh/id_rsa", pk有密码和无密码在这里面验证
func (ss *SSH) sshPrivateKeyMethod(pkFile, pkPassword string) (am ssh.AuthMethod, err error) {
	pkData := ss.readFile(pkFile)
	var pk ssh.Signer
	if pkPassword == "" {
		pk, err = ssh.ParsePrivateKey(pkData)
		if err != nil {
			return nil, err
		}
	} else {
		bufPwd := []byte(pkPassword)
		pk, err = ssh.ParsePrivateKeyWithPassphrase(pkData, bufPwd)
		if err != nil {
			return nil, err
		}
	}
	return ssh.PublicKeys(pk), nil
}

func (ss *SSH) sshPasswordMethod(passwd string) ssh.AuthMethod {
	return ssh.Password(passwd)
}

// readFile 从文件读取privateKey， 并返回[]byte 无需返回string。
// 直接返回[]byte， 避免重复 []byte -> string -> []byte
func (ss *SSH) readFile(name string) []byte {
	content, err := ioutil.ReadFile(name)
	if err != nil {
		logger.Error("[globals] read %s file err is : %s", name, err)
		os.Exit(1)
	}
	return content
}

func (ss *SSH) addrReformat(host string) string {
	if strings.Index(host, ":") == -1 {
		host = fmt.Sprintf("%s:22", host)
	}
	return host
}
