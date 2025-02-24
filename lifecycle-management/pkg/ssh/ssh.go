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
	"time"

	"github.com/spf13/pflag"
	"golang.org/x/crypto/ssh"
	"golang.org/x/sync/errgroup"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutils "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	defaultMaxRetry         = 5
	defaultExecutionTimeout = 300 * time.Second
)

func RegisterFlags(fs *pflag.FlagSet) {
	fs.IntVar(&defaultMaxRetry, "max-retry", defaultMaxRetry, "define max num of ssh retry times")
	fs.DurationVar(&defaultExecutionTimeout, "execution-timeout", defaultExecutionTimeout, "timeout setting of command execution")
}

// GetTimeoutContext create a context.Context with default timeout
// default execution timeout in sealos is just fine, if you want to customize the timeout setting,
// you must invoke the `RegisterFlags` function above.
func GetTimeoutContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), defaultExecutionTimeout)
}

type Interface interface {
	// Copy copy local file to remote
	// scp -r /tmp root@192.168.0.2:/root/tmp => Copy("192.168.0.2","tmp","/root/tmp")
	// skip checksum if env DO_NOT_CHECKSUM=true
	Copy(host, src, dst string) error
	// Fetch fetch remote file to local
	// scp -r root@192.168.0.2:/remote/path/file /local/path/file => Fetch("192.168.0.2","/remote/path/file", "/local/path/file",)
	Fetch(host, src, dst string) error
	// CmdAsync exec commands on remote host asynchronously
	CmdAsync(host string, cmds ...string) error
	CmdAsyncWithContext(ctx context.Context, host string, cmds ...string) error
	// Cmd exec command on remote host, and return combined standard output and standard error
	Cmd(host, cmd string) ([]byte, error)
	// CmdToString exec command on remote host, and return spilt standard output by separator and standard error
	CmdToString(host, cmd, spilt string) (string, error)
	Ping(host string) error
}

type Client struct {
	*ssh.ClientConfig
	*Option
}

var _ Interface = &Client{}

var defaultCiphers = []string{
	"aes128-ctr", "aes192-ctr", "aes256-ctr",
	"chacha20-poly1305@openssh.com",
	"aes128-gcm@openssh.com",
	"arcfour256", "arcfour128",
	"aes128-cbc", "aes192-cbc", "aes256-cbc",
	"3des-cbc",
}

func New(opt *Option, opts ...OptionFunc) (*Client, error) {
	return newFromOptions(opt, opts...)
}

func newFromOptions(opt *Option, opts ...OptionFunc) (*Client, error) {
	if opt == nil {
		opt = NewOption()
	}
	for i := range opts {
		opts[i](opt)
	}

	config := &ssh.ClientConfig{
		Config: ssh.Config{
			Ciphers: defaultCiphers,
		},
		User:            opt.user,
		Timeout:         opt.timeout,
		Auth:            []ssh.AuthMethod{},
		HostKeyCallback: opt.hostKeyCallback,
	}
	if len(opt.password) > 0 {
		config.Auth = append(config.Auth, ssh.Password(opt.password))
	}
	if len(opt.rawPrivateKeyData) > 0 {
		signer, err := parsePrivateKey([]byte(opt.rawPrivateKeyData), []byte(opt.passphrase))
		if err != nil {
			return nil, err
		}
		config.Auth = append(config.Auth, ssh.PublicKeys(signer))
	} else if len(opt.privateKey) > 0 {
		if !fileutils.IsExist(opt.privateKey) {
			logger.Debug("not trying to parse private key file cause it's not exists")
		} else {
			signer, err := parsePrivateKeyFile(opt.privateKey, opt.passphrase)
			if err != nil {
				return nil, err
			}
			config.Auth = append(config.Auth, ssh.PublicKeys(signer))
		}
	}
	return &Client{ClientConfig: config, Option: opt}, nil
}

func newOptionFromSSH(ssh *v2.SSH, isStdout bool) *Option {
	opts := []OptionFunc{
		WithStdoutEnable(isStdout),
	}
	if len(ssh.User) > 0 {
		opts = append(opts, WithUsername(ssh.User))
	}
	if len(ssh.Passwd) > 0 {
		opts = append(opts, WithPassword(ssh.Passwd))
	}
	if len(ssh.Pk) > 0 {
		opts = append(opts, WithPrivateKeyAndPhrase(ssh.Pk, ssh.PkPasswd))
	}
	if len(ssh.PkData) > 0 {
		opts = append(opts, WithRawPrivateKeyDataAndPhrase(ssh.PkData, ssh.PkPasswd))
	}
	if ssh.User != "" && ssh.User != defaultUsername {
		opts = append(opts, WithSudoEnable(true))
	}

	opt := NewOption()
	for i := range opts {
		opts[i](opt)
	}
	return opt
}

func newFromSSH(ssh *v2.SSH, isStdout bool) (Interface, error) {
	return New(newOptionFromSSH(ssh, isStdout))
}

func MustNewClient(ssh *v2.SSH, isStdout bool) Interface {
	client, err := newFromSSH(ssh, isStdout)
	if err != nil {
		logger.Fatal("failed to create ssh client: %v", err)
	}
	return client
}

func NewCacheClientFromCluster(cluster *v2.Cluster, isStdout bool) Interface {
	cc := &clusterClient{
		cluster:  cluster,
		isStdout: isStdout,
		configs:  make(map[string]*Option),
		cache:    make(map[*Option]Interface),
	}
	return cc
}

func WaitReady(client Interface, _ int, hosts ...string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range hosts {
		host := hosts[i]
		eg.Go(func() (err error) {
			return client.Ping(host)
		})
	}
	return eg.Wait()
}
