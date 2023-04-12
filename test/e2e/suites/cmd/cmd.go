package cmd

import (
	"errors"
	"os"
	"os/exec"
	"strings"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/file"
)

// CmdInterface defines the interface for executing commands
type CmdInterface interface {
	Exec(cmd string, args ...string) ([]byte, error)
	AsyncExec(cmd string, args ...string) error
	Copy(src string, dst string) error
	CopyR(dst string, src string) error
}

var _ = (CmdInterface)(&RemoteCmd{})
var _ = (CmdInterface)(&LocalCmd{})

// Exec executes the given command on the remote machine
func (c RemoteCmd) Exec(cmd string, args ...string) ([]byte, error) {
	if c.Interface == nil {
		return nil, errors.New("SSHInterface not initialized")
	}
	return c.Cmd(c.Host, strings.Join(append([]string{cmd}, args...), " "))
}

func (c RemoteCmd) AsyncExec(cmd string, args ...string) error {
	return c.CmdAsync(c.Host, strings.Join(append([]string{cmd}, args...), " "))
}

func (c RemoteCmd) Copy(src string, dst string) error {
	return c.Interface.Copy(c.Host, src, dst)
}

func (c RemoteCmd) CopyR(dst string, src string) error {
	return c.Interface.CopyR(c.Host, dst, src)
}

// RemoteCmd implements the CmdInterface for remote command execution using SSH
type RemoteCmd struct {
	Host string
	ssh.Interface
}

// LocalCmd implements the CmdInterface for local command execution using os/exec
type LocalCmd struct{}

// Exec executes the given command on the local machine
func (c LocalCmd) Exec(cmd string, args ...string) ([]byte, error) {
	return exec.Command(cmd, args...).CombinedOutput()
}

func (c LocalCmd) AsyncExec(cmd string, arg ...string) error {
	cmder := exec.Command(cmd, arg...)
	cmder.Stdout = os.Stdout
	cmder.Stderr = os.Stderr
	if err := cmder.Run(); err != nil {
		return err
	}
	return cmder.Wait()
}

func (c LocalCmd) Copy(src string, dst string) error {
	return file.RecursionCopy(src, dst)
}

func (c LocalCmd) CopyR(dst string, src string) error {
	return file.RecursionCopy(src, dst)
}
