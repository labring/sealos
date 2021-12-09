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

package sshutil

import (
	"fmt"
	"io/ioutil"
	"os"
	"strings"
	"time"

	"github.com/fanux/sealos/pkg/logger"
	"golang.org/x/crypto/ssh"
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
		User:            ss.User,
		Auth:            auth,
		Timeout:         *ss.Timeout,
		Config:          config,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
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

// 使用 pk认证， pk路径为 "$HOME/.ssh/id_rsa", pk有密码和无密码在这里面验证
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
	if !strings.Contains(host, ":") {
		host = fmt.Sprintf("%s:22", host)
	}
	return host
}
