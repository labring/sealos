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
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

type HostClientMap struct {
	ClientMap map[string]HostClient
	Mux       sync.Mutex
}

type HostClient struct {
	SSHClient  *ssh.Client
	SftpClient *sftp.Client
}

var hostsClientMap = &HostClientMap{
	ClientMap: make(map[string]HostClient),
}

func (c *Client) connect(host string) (*ssh.Client, error) {
	ip, port := iputils.GetSSHHostIPAndPort(host)
	addr := formalizeAddr(ip, port)
	return ssh.Dial("tcp", addr, c.ClientConfig)
}

func newSession(client *ssh.Client) (*ssh.Session, error) {
	session, err := client.NewSession()
	if err != nil {
		_ = client.Close()
		return nil, err
	}
	modes := ssh.TerminalModes{
		ssh.ECHO:          0,     //disable echoing
		ssh.TTY_OP_ISPEED: 14400, // input speed = 14.4kbaud
		ssh.TTY_OP_OSPEED: 14400, // output speed = 14.4kbaud
	}
	if err := session.RequestPty("xterm", 80, 40, modes); err != nil {
		_ = session.Close()
		_ = client.Close()
		return nil, err
	}
	return session, nil
}

func (c *Client) Connect(host string) (sshClient *ssh.Client, session *ssh.Session, err error) {
	err = exponentialBackOffRetry(defaultMaxRetry, time.Millisecond*100, 2, func() error {
		sshClient, session, err = c.newClientAndSession(host)
		return err
	}, isErrorWorthRetry)
	return
}

func isErrorWorthRetry(err error) bool {
	return strings.Contains(err.Error(), "connection reset by peer") ||
		strings.Contains(err.Error(), io.EOF.Error())
}

func exponentialBackOffRetry(steps int, interval time.Duration, factor int,
	fn func() error,
	retryIfCertainError func(error) bool) error {
	var err error
	for i := 0; i < steps; i++ {
		if i > 0 {
			logger.Debug("retrying %s later due to error occur: %v", interval, err)
			time.Sleep(interval)
			interval *= time.Duration(factor)
		}
		if err = fn(); err != nil {
			if retryIfCertainError(err) {
				continue
			}
			return err
		}
		break
	}
	return err
}

func (c *Client) newClientAndSession(host string) (*ssh.Client, *ssh.Session, error) {
	sshClient, err := c.connect(host)
	if err != nil {
		return nil, nil, err
	}
	session, err := newSession(sshClient)
	return sshClient, session, err
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

func formalizeAddr(host, port string) string {
	if !strings.Contains(host, ":") {
		host = fmt.Sprintf("%s:%s", host, port)
	}
	return host
}
