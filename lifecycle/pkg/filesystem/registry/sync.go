/*
Copyright 2023 fengxsong@outlook.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

	http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package registry

import (
	"context"
	"fmt"
	"path/filepath"
	"strings"
	"time"

	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/types"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/sreg/registry/handler"
	"github.com/labring/sealos/pkg/sreg/registry/sync"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/file"
	httputils "github.com/labring/sealos/pkg/utils/http"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	localhost            = "127.0.0.1"
	defaultTemporaryPort = "5050"
	registryPIDFileName  = "registry.pid"
)

const (
	httpMode int = iota
	sshMode
)

type impl struct {
	pathResolver constants.PathResolver
	execer       exec.Interface
	mounts       []v2.MountImage
}

func shouldSkip(mounts []v2.MountImage) bool {
	for i := range mounts {
		if file.IsDir(filepath.Join(mounts[i].MountPoint, constants.RegistryDirName)) {
			return false
		}
	}
	return true
}

func (s *impl) Sync(ctx context.Context, hosts ...string) error {
	if shouldSkip(s.mounts) {
		return nil
	}
	logger.Info("trying default http mode to sync images to hosts %v", hosts)

	type syncOption struct {
		target string
		typ    int
	}

	syncOptionChan := make(chan *syncOption, len(hosts))
	var (
		cancelFuncs         []context.CancelFunc
		temporaryRegistries []string
	)
	defer func() {
		for _, cancel := range cancelFuncs {
			cancel()
		}
		for _, host := range temporaryRegistries {
			if err := s.cleanupRemoteTemporaryRegistry(host); err != nil {
				logger.Debug("failed to cleanup remote temporary registry on host %s: %v", host, err)
			}
		}
	}()

	// run `sealctl registry serve` to start a temporary registry
	for i := range hosts {
		ep := sync.ParseRegistryAddress(trimPortStr(hosts[i]), defaultTemporaryPort)
		if err := checkRemoteTemporaryRegistry(ctx, hosts[i], defaultTemporaryPort); err == nil {
			logger.Debug("remote temporary registry %s is already alive, reuse it", ep)
			syncOptionChan <- &syncOption{target: ep, typ: httpMode}
			continue
		}

		if err := s.cleanupRemoteTemporaryRegistry(hosts[i]); err != nil {
			logger.Debug("failed to cleanup stale remote temporary registry on host %s: %v", hosts[i], err)
		}

		registryServeCommand, ok := s.getRegistryServeCommand(hosts[i], defaultTemporaryPort)
		if !ok {
			logger.Debug("remote temporary registry is unsupported on host %s, fallback using ssh mode instead", hosts[i])
			syncOptionChan <- &syncOption{target: hosts[i], typ: sshMode}
			continue
		}

		cmdCtx, cancel := context.WithCancel(ctx)
		cancelFuncs = append(cancelFuncs, cancel)
		temporaryRegistries = append(temporaryRegistries, hosts[i])
		go func(ctx context.Context, host string) {
			logger.Debug("running temporary registry on host %s", host)
			if err := s.execer.CmdAsyncWithContext(ctx, host, registryServeCommand); err != nil {
				// ignore expected signal killed error when context cancel
				if !strings.Contains(err.Error(), "signal: killed") && !strings.Contains(err.Error(), "context canceled") {
					if waitRemoteTemporaryRegistry(ctx, host, defaultTemporaryPort) == nil {
						logger.Debug("remote temporary registry on host %s is already alive, ignore serve command error: %v", host, err)
						return
					}
					logger.Error(err)
				}
			}
		}(cmdCtx, hosts[i])
		go func(target string) {
			if err := waitRemoteTemporaryRegistry(ctx, target, defaultTemporaryPort); err != nil {
				logger.Warn("cannot connect to remote temporary registry %s: %v, fallback using ssh mode instead", ep, err)
				syncOptionChan <- &syncOption{target: target, typ: sshMode}
			} else {
				syncOptionChan <- &syncOption{target: ep, typ: httpMode}
			}
		}(hosts[i])
	}

	eg, _ := errgroup.WithContext(ctx)
	for i := 0; i < len(hosts); i++ {
		opt, ok := <-syncOptionChan
		if !ok {
			break
		}
		for j := range s.mounts {
			registryDir := filepath.Join(s.mounts[j].MountPoint, constants.RegistryDirName)
			if !file.IsDir(registryDir) {
				continue
			}
			eg.Go(func() (err error) {
				switch opt.typ {
				case httpMode:
					err = syncViaHTTP(ctx, opt.target, registryDir)
				case sshMode:
					err = syncViaSSH(ctx, s, opt.target, registryDir)
				}
				return
			})
		}
	}
	return eg.Wait()
}

func (s *impl) cleanupRemoteTemporaryRegistry(host string) error {
	output, err := s.execer.Cmd(host, getRegistryServeCleanupCommand(s.pathResolver))
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(output)))
	}
	return nil
}

func waitRemoteTemporaryRegistry(ctx context.Context, target, port string) error {
	return waitRemoteTemporaryRegistryWithTimeout(ctx, target, port, 3*time.Second)
}

func checkRemoteTemporaryRegistry(ctx context.Context, target, port string) error {
	return waitRemoteTemporaryRegistryWithTimeout(ctx, target, port, 500*time.Millisecond)
}

func waitRemoteTemporaryRegistryWithTimeout(ctx context.Context, target, port string, timeout time.Duration) error {
	probeCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	ep := sync.ParseRegistryAddress(trimPortStr(target), port)
	return httputils.WaitUntilEndpointAlive(probeCtx, "http://"+ep)
}

func trimPortStr(s string) string {
	if idx := strings.Index(s, ":"); idx > 0 {
		return s[:idx]
	}
	return s
}

type registryServeFlags struct {
	portFlag       string
	pidFile        bool
	disableLogging bool
}

func (s *impl) getRegistryServeCommand(host, port string) (string, bool) {
	output, err := s.execer.Cmd(host, getRegistryServeProbeCommand(s.pathResolver, port))
	if err != nil {
		logger.Debug("failed to probe remote temporary registry on host %s: %v", host, err)
		return "", false
	}

	fields := strings.Fields(strings.TrimSpace(string(output)))
	if len(fields) == 0 {
		return "", false
	}
	flags := registryServeFlags{portFlag: fields[0]}
	switch flags.portFlag {
	case "--port", "-p":
	default:
		return "", false
	}
	for _, field := range fields[1:] {
		switch field {
		case "--pid-file":
			flags.pidFile = true
		case "--disable-logging":
			flags.disableLogging = true
		}
	}
	return getRegistryServeCommand(s.pathResolver, port, flags), true
}

func getRegistryServeProbeCommand(pathResolver constants.PathResolver, port string) string {
	return fmt.Sprintf("if %[1]s registry serve filesystem --port %[2]s --help >/dev/null 2>&1; then printf -- '--port'; elif %[1]s registry serve filesystem -p %[2]s --help >/dev/null 2>&1; then printf -- '-p'; else exit 0; fi; if %[1]s registry serve filesystem --pid-file %[3]s --help >/dev/null 2>&1; then printf ' --pid-file'; fi; if %[1]s registry serve filesystem --disable-logging=true --help >/dev/null 2>&1; then printf ' --disable-logging'; fi",
		pathResolver.RootFSSealctlPath(), port, registryPIDFile(pathResolver),
	)
}

func getRegistryServeCommand(pathResolver constants.PathResolver, port string, flags registryServeFlags) string {
	args := []string{
		pathResolver.RootFSSealctlPath(),
		"registry", "serve", "filesystem",
		flags.portFlag, port,
	}
	if flags.pidFile {
		args = append(args, "--pid-file", registryPIDFile(pathResolver))
	}
	if flags.disableLogging {
		args = append(args, "--disable-logging=true")
	}
	args = append(args, pathResolver.RootFSRegistryPath())
	return strings.Join(args, " ") + " >/dev/null 2>&1"
}

func getRegistryServeCleanupCommand(pathResolver constants.PathResolver) string {
	return fmt.Sprintf("if [ -s %[1]s ]; then pid=$(cat %[1]s 2>/dev/null || true); if [ -n \"$pid\" ] && [ -r \"/proc/$pid/cmdline\" ]; then cmd=$(tr '\\000' ' ' < \"/proc/$pid/cmdline\" 2>/dev/null || true); case \"$cmd\" in *\"%[2]s registry serve filesystem\"*\"%[3]s\"*) kill \"$pid\" 2>/dev/null || true;; esac; fi; rm -f %[1]s; fi",
		registryPIDFile(pathResolver),
		pathResolver.RootFSSealctlPath(),
		pathResolver.RootFSRegistryPath(),
	)
}

func registryPIDFile(pathResolver constants.PathResolver) string {
	return filepath.Join(pathResolver.RootFSPath(), registryPIDFileName)
}

func syncViaSSH(_ context.Context, s *impl, target string, localDir string) error {
	return ssh.CopyDir(s.execer, target, localDir, s.pathResolver.RootFSRegistryPath(), nil)
}

func syncViaHTTP(ctx context.Context, target string, localDir string) error {
	sys := &types.SystemContext{
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
	}

	config, err := handler.NewConfig(localDir, 0)
	if err != nil {
		return err
	}
	config.Log.AccessLog.Disabled = true
	errCh := handler.Run(ctx, config)
	defer func() {
		// for notifying shutdown http Server
		errCh <- nil
	}()

	src := sync.ParseRegistryAddress(localhost, config.HTTP.Addr)
	probeCtx, cancel := context.WithTimeout(ctx, time.Second*3)
	defer cancel()
	if err = httputils.WaitUntilEndpointAlive(probeCtx, "http://"+src); err != nil {
		return err
	}
	opts := &sync.Options{
		SystemContext: sys,
		Source:        src,
		Target:        target,
		SelectionOptions: []copy.ImageListSelection{
			copy.CopyAllImages, copy.CopySystemImage,
		},
		OmitError: true,
	}

	if err = sync.ToRegistry(ctx, opts); err != nil && !strings.Contains(err.Error(), "manifest unknown") {
		return err
	}
	return nil
}

func New(pathResolver constants.PathResolver, execer exec.Interface, mounts []v2.MountImage) filesystem.RegistrySyncer {
	return &impl{pathResolver, execer, mounts}
}
