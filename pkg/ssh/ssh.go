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
	"errors"
	"fmt"
	"net"
	"strings"
	"sync"
	"time"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Interface interface {
	// Copy is copy local files to remote host
	// scp -r /tmp root@192.168.0.2:/root/tmp => Copy("192.168.0.2","tmp","/root/tmp")
	// need check md5sum
	Copy(host, srcFilePath, dstFilePath string) error
	// CmdAsync is exec command on remote host, and asynchronous return logs
	CmdAsync(host string, cmd ...string) error
	// Cmd is exec command on remote host, and return combined standard output and standard error
	Cmd(host, cmd string) ([]byte, error)
	//CmdToString is exec command on remote host, and return spilt standard output and standard error
	CmdToString(host, cmd, spilt string) (string, error)
	Ping(host string) error
}

type SSH struct {
	isStdout     bool
	User         string
	Password     string
	PkFile       string
	PkData       string
	PkPassword   string
	Timeout      *time.Duration
	LocalAddress *[]net.Addr
}

func NewSSHClient(ssh *v2.SSH, isStdout bool) Interface {
	if ssh.User == "" {
		ssh.User = v2.DefaultUserRoot
	}
	address, err := iputils.ListLocalHostAddrs()
	// todo: return error?
	if err != nil {
		logger.Warn("failed to get local address, %v", err)
	}
	return &SSH{
		isStdout:     isStdout,
		User:         ssh.User,
		Password:     ssh.Passwd,
		PkFile:       ssh.Pk,
		PkData:       ssh.PkData,
		PkPassword:   ssh.PkPasswd,
		LocalAddress: address,
	}
}

func NewSSHByCluster(cluster *v2.Cluster, isStdout bool) (Interface, error) {
	var ipList []string
	sshClient := NewSSHClient(&cluster.Spec.SSH, isStdout)
	ipList = append(ipList, append(cluster.GetIPSByRole(v2.Master), cluster.GetIPSByRole(v2.Node)...)...)

	err := WaitSSHReady(sshClient, 6, ipList...)
	if err != nil {
		return nil, err
	}

	return sshClient, nil
}

type Client struct {
	SSH  Interface
	Host string
}

func WaitSSHReady(ssh Interface, tryTimes int, hosts ...string) error {
	errCh := make(chan error, len(hosts))
	var wg sync.WaitGroup
	for _, h := range hosts {
		wg.Add(1)
		go func(host string) {
			defer wg.Done()
			var err error
			for i := 0; i < tryTimes; i++ {
				err = ssh.Ping(host)
				if err == nil {
					errCh <- nil
					return
				}
				time.Sleep(time.Duration(i) * time.Second)
			}
			errCh <- fmt.Errorf("wait for [%s] ssh ready timeout:  %v, ensure that the IP address or password is correct", host, err)
		}(h)
	}
	wg.Wait()
	close(errCh)
	var ret []string
	for err := range errCh {
		if err != nil {
			ret = append(ret, err.Error())
		}
	}
	if len(ret) > 0 {
		return errors.New(strings.Join(ret, ","))
	}
	return nil
}
