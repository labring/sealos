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
	"context"
	"net"
	"time"

	"github.com/spf13/pflag"
	"golang.org/x/crypto/ssh"
	"golang.org/x/sync/errgroup"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

var defaultMaxRetry = 5

func RegisterFlags(fs *pflag.FlagSet) {
	fs.IntVar(&defaultMaxRetry, "max-retry", defaultMaxRetry, "define max num of ssh retry times")
}

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
	isStdout   bool
	User       string
	Password   string
	PkFile     string
	PkData     string
	PkPassword string
	Timeout    time.Duration

	// private properties
	localAddress *[]net.Addr
	clientConfig *ssh.ClientConfig
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
		localAddress: address,
	}
}

func NewSSHByCluster(cluster *v2.Cluster, isStdout bool) (Interface, error) {
	var ipList []string
	sshClient := NewSSHClient(&cluster.Spec.SSH, isStdout)
	ipList = append(ipList, append(cluster.GetIPSByRole(v2.Master), cluster.GetIPSByRole(v2.Node)...)...)
	return sshClient, WaitSSHReady(sshClient, defaultMaxRetry, ipList...)
}

type Client struct {
	SSH  Interface
	Host string
}

func WaitSSHReady(ssh Interface, _ int, hosts ...string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() (err error) {
			return ssh.Ping(host)
		})
	}
	return eg.Wait()
}
