// Copyright © 2021 Alibaba Group Holding Ltd.
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

package ssh

import (
	"fmt"
	"net"
	"os"
	"path"
	"strconv"
	"strings"
	"time"

	"golang.org/x/crypto/ssh"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (s *SSH) getClientConfig() *ssh.ClientConfig {
	if s.clientConfig == nil {
		auth := s.sshAuthMethod(s.Password, s.PkFile, s.PkData, s.PkPassword)
		config := ssh.Config{
			Ciphers: []string{"aes128-ctr", "aes192-ctr", "aes256-ctr", "aes128-gcm@openssh.com", "arcfour256", "arcfour128", "aes128-cbc", "3des-cbc", "aes192-cbc", "aes256-cbc"},
		}
		defaultTimeout := time.Duration(15) * time.Second
		if s.Timeout <= 0 {
			s.Timeout = defaultTimeout
		}
		s.clientConfig = &ssh.ClientConfig{
			User:    s.User,
			Auth:    auth,
			Timeout: s.Timeout,
			Config:  config,
			HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
				return nil
			},
		}
	}
	return s.clientConfig
}

// SSH connection operation
func (s *SSH) connect(host string) (*ssh.Client, error) {
	clientConfig := s.getClientConfig()
	ip, port := iputils.GetSSHHostIPAndPort(host)
	addr := s.addrReformat(ip, port)
	return ssh.Dial("tcp", addr, clientConfig)
}

func (s *SSH) Connect(host string) (*ssh.Client, *ssh.Session, error) {
	client, err := s.connect(host)
	if err != nil {
		return nil, nil, err
	}

	session, err := client.NewSession()
	if err != nil {
		_ = client.Close()
		return nil, nil, err
	}

	modes := ssh.TerminalModes{
		ssh.ECHO:          0,     //disable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}

	if err := session.RequestPty("xterm", 80, 40, modes); err != nil {
		_ = session.Close()
		_ = client.Close()
		return nil, nil, err
	}

	return client, session, nil
}

func (s *SSH) sshAuthMethod(password, pkFile, pkData, pkPasswd string) (auth []ssh.AuthMethod) {
	if pkData != "" {
		signer, err := parsePrivateKey([]byte(pkData), []byte(pkPasswd))
		if err == nil {
			auth = append(auth, ssh.PublicKeys(signer))
		}
	}
	if fileExist(pkFile) {
		signer, err := parsePrivateKeyFile(pkFile, pkPasswd)
		if err == nil {
			auth = append(auth, ssh.PublicKeys(signer))
		}
	}
	if password != "" {
		auth = append(auth, ssh.Password(password))
	}
	return auth
}

func parsePrivateKey(pemBytes []byte, password []byte) (ssh.Signer, error) {
	if len(password) == 0 {
		return ssh.ParsePrivateKey(pemBytes)
	}
	return ssh.ParsePrivateKeyWithPassphrase(pemBytes, password)
}

func parsePrivateKeyFile(filename string, password string) (ssh.Signer, error) {
	pemBytes, err := os.ReadFile(filename)
	if err != nil {
		return nil, fmt.Errorf("failed to read private key file %v", err)
	}
	return parsePrivateKey(pemBytes, []byte(password))
}

func fileExist(path string) bool {
	_, err := os.Stat(path)
	return err == nil || os.IsExist(err)
}

func (s *SSH) addrReformat(host, port string) string {
	if !strings.Contains(host, ":") {
		host = fmt.Sprintf("%s:%s", host, port)
	}
	return host
}

func (s *SSH) remoteFileExist(host, remoteFilePath string) bool {
	// if remote file is
	// ls -l | grep aa | wc -l
	remoteFileName := path.Base(remoteFilePath) // aa
	remoteFileDirName := path.Dir(remoteFilePath)
	//it's bug: if file is aa.bak, `ls -l | grep aa | wc -l` is 1 ,should use `ll aa 2>/dev/null |wc -l`
	//remoteFileCommand := fmt.Sprintf("ls -l %s| grep %s | grep -v grep |wc -l", remoteFileDirName, remoteFileName)
	remoteFileCommand := fmt.Sprintf("ls -l %s/%s 2>/dev/null |wc -l", remoteFileDirName, remoteFileName)

	data, err := s.CmdToString(host, remoteFileCommand, " ")
	if err != nil {
		logger.Error("[ssh][%s]remoteFileCommand err:%s", host, err)
	}
	count, err := strconv.Atoi(strings.TrimSpace(data))
	if err != nil {
		logger.Error("[ssh][%s]RemoteFileExist:%s", host, err)
	}
	return count != 0
}
