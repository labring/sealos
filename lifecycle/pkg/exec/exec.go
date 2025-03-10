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

package exec

import (
	"context"
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/unshare"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
	netutil "github.com/labring/sealos/pkg/utils/net"
)

type Interface ssh.Interface

type wrap struct {
	inner          ssh.Interface
	localAddresses sets.Set[string]
}

func New(inner ssh.Interface) (Interface, error) {
	addr, err := net.InterfaceAddrs()
	if err != nil {
		return nil, fmt.Errorf("could not get local addresses: %v", err)
	}
	return &wrap{
		inner:          inner,
		localAddresses: sets.Set[string](netutil.AddressSet(isValid, addr)),
	}, nil
}

func (w *wrap) Ping(host string) error {
	if w.isLocal(host) {
		logger.Debug("host %s is local, ping is always true", host)
		return nil
	}
	return w.inner.Ping(host)
}

func (w *wrap) Cmd(host string, command string) ([]byte, error) {
	if w.isLocal(host) {
		// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
		b, err := exec.Command("/bin/bash", "-c", command).CombinedOutput()
		return b, err
	}
	return w.inner.Cmd(host, command)
}

func (w *wrap) CmdAsyncWithContext(ctx context.Context, host string, commands ...string) error {
	if w.isLocal(host) {
		for i := range commands {
			// nosemgrep: go.lang.security.audit.dangerous-exec-command.dangerous-exec-command
			cmd := exec.CommandContext(ctx, "/bin/bash", "-c", commands[i])
			cmd.Stdout = os.Stdout
			cmd.Stderr = os.Stderr
			if err := cmd.Run(); err != nil {
				return err
			}
		}
		return nil
	}
	return w.inner.CmdAsyncWithContext(ctx, host, commands...)
}

func (w *wrap) CmdAsync(host string, commands ...string) error {
	ctx, cancel := ssh.GetTimeoutContext()
	defer cancel()
	return w.CmdAsyncWithContext(ctx, host, commands...)
}

func warnIfNotAbs(path string) {
	if !filepath.IsAbs(path) {
		logger.Warn(`%s is not an absolute path, copy might not work as expected.`, path)
	}
}

func (w *wrap) Copy(host string, src string, dest string) error {
	if w.isLocal(host) {
		warnIfNotAbs(src)
		warnIfNotAbs(dest)
		logger.Debug("copy files src %s to dst %s on %s locally", src, dest, host)
		return fileutil.RecursionCopy(src, dest)
	}
	return w.inner.Copy(host, src, dest)
}

func (w *wrap) Fetch(host string, src string, dest string) error {
	if w.isLocal(host) {
		warnIfNotAbs(src)
		warnIfNotAbs(dest)
		logger.Debug("fetch files src %s to dst %s on %s locally", src, dest, host)
		return fileutil.RecursionCopy(src, dest)
	}
	return w.inner.Fetch(host, src, dest)
}

func (w *wrap) CmdToString(host, cmd, sep string) (string, error) {
	output, err := w.Cmd(host, cmd)
	if err != nil {
		return "", err
	}
	if len(output) == 0 {
		return "", fmt.Errorf("command %s on %s return nil", cmd, host)
	}
	return getOnelineResult(string(output), sep), nil
}

func getOnelineResult(output string, sep string) string {
	return strings.ReplaceAll(strings.ReplaceAll(output, "\r\n", sep), "\n", sep)
}

func isValid(ip net.IP) bool {
	return netutil.IsValidForSet(false, ip)
}

func (w *wrap) isLocal(addr string) bool {
	if unshare.IsRootless() {
		return false
	}
	host := iputils.GetHostIP(addr)
	if host == "localhost" || host == "127.0.0.1" || w.localAddresses.Has(host) {
		return true
	}
	return false
}
