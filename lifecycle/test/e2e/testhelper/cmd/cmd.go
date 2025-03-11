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

package cmd

import (
	"errors"
	"os"
	"os/exec"
	"strings"

	"github.com/labring/sealos/pkg/types/v1beta1"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/file"
)

// Interface defines the interface for executing commands
type Interface interface {
	Exec(cmd string, args ...string) ([]byte, error)
	AsyncExec(cmd string, args ...string) error
	Copy(src string, dst string) error
	CopyR(dst string, src string) error
}

var _ = (Interface)(&RemoteCmd{})
var _ = (Interface)(&LocalCmd{})

// Exec executes the given command on the remote machine
func (c *RemoteCmd) Exec(cmd string, args ...string) ([]byte, error) {
	if c.Interface == nil {
		return nil, errors.New("SSHInterface not initialized")
	}
	return c.Cmd(c.Host, strings.Join(append([]string{cmd}, args...), " "))
}

func (c *RemoteCmd) AsyncExec(cmd string, args ...string) error {
	return c.CmdAsync(c.Host, strings.Join(append([]string{cmd}, args...), " "))
}

func (c *RemoteCmd) Copy(src string, dst string) error {
	return c.Interface.Copy(c.Host, src, dst)
}

func (c *RemoteCmd) CopyR(dst string, src string) error {
	return c.Interface.Fetch(c.Host, src, dst)
}

// RemoteCmd implements the Interface for remote command execution using SSH
type RemoteCmd struct {
	Host string
	ssh.Interface
}

func NewRemoteCmd(host string, s *v1beta1.SSH) Interface {
	return &RemoteCmd{
		Host:      host,
		Interface: ssh.MustNewClient(s, true),
	}
}

// LocalCmd implements the Interface for local command execution using os/exec
type LocalCmd struct{}

// Exec executes the given command on the local machine
func (c LocalCmd) Exec(cmd string, args ...string) ([]byte, error) {
	return exec.Command(cmd, args...).CombinedOutput()
}

func (c LocalCmd) AsyncExec(cmd string, arg ...string) error {
	cmder := exec.Command(cmd, arg...)
	cmder.Stdout = os.Stdout
	cmder.Stderr = os.Stderr
	return cmder.Run()
}

func (c LocalCmd) Copy(src string, dst string) error {
	return file.RecursionCopy(src, dst)
}

func (c LocalCmd) CopyR(dst string, src string) error {
	return file.RecursionCopy(src, dst)
}
