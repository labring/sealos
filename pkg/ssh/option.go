// Copyright © 2023 sealos.
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
	"net"
	"path"
	"time"

	"github.com/spf13/pflag"
	"golang.org/x/crypto/ssh"

	"github.com/labring/sealos/pkg/constants"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
)

type Option struct {
	Stdout            bool
	User              string
	Password          string
	PrivateKey        string
	RawPrivateKeyData string
	Passphrase        string
	Timeout           time.Duration
	HostKeyCallback   ssh.HostKeyCallback
}

func (o *Option) BindFlags(fs *pflag.FlagSet) {
	fs.BoolVar(&o.Stdout, "stdout", o.Stdout, "print logs to stdout")
	fs.StringVarP(&o.User, "user", "u", o.User, "username to authenticate as")
	fs.StringVarP(&o.Password, "password", "p", o.Password, "use given password to authenticate with")
	fs.StringVarP(&o.PrivateKey, "private-key", "i", o.PrivateKey,
		"selects a file from which the identity (private key) for public key authentication is read")
	fs.StringVar(&o.Passphrase, "passphrase", o.Passphrase, "passphrase for decrypting a PEM encoded private key")
	fs.DurationVar(&o.Timeout, "timeout", o.Timeout, "ssh connection timeout")
}

func NewOption() *Option {
	homedir := constants.GetHomeDir()
	getSSHFile := func(filenames ...string) string {
		for _, fn := range filenames {
			absPath := path.Join(homedir, ".ssh", fn)
			if file.IsExist(absPath) {
				return absPath
			}
		}
		return ""
	}
	opt := &Option{
		User:       v2.DefaultUserRoot,
		PrivateKey: getSSHFile("id_rsa", "id_dsa"),
		Timeout:    10 * time.Second,
		HostKeyCallback: func(hostname string, remote net.Addr, key ssh.PublicKey) error {
			return nil
		},
	}
	return opt
}

type OptionFunc func(*Option)

func WithStdout(b bool) OptionFunc {
	return func(o *Option) {
		o.Stdout = b
	}
}

func WithUser(u string) OptionFunc {
	return func(o *Option) {
		o.User = u
	}
}

func WithPassword(p string) OptionFunc {
	return func(o *Option) {
		o.Password = p
	}
}

func WithRawPrivateKeyDataAndPhrase(raw, passphrase string) OptionFunc {
	return func(o *Option) {
		o.RawPrivateKeyData = raw
		o.Passphrase = passphrase
	}
}

func WithPrivateKeyAndPhrase(pk, passphrase string) OptionFunc {
	return func(o *Option) {
		o.PrivateKey = pk
		o.Passphrase = passphrase
	}
}

func WithTimeout(timeout time.Duration) OptionFunc {
	if timeout == 0 {
		timeout = 10 * time.Second
	}
	return func(o *Option) {
		o.Timeout = timeout
	}
}

func WithHostKeyCallback(fn ssh.HostKeyCallback) OptionFunc {
	return func(o *Option) {
		o.HostKeyCallback = fn
	}
}
