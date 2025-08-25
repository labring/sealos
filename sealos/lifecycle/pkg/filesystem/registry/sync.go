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

	"github.com/labring/sreg/pkg/registry/handler"
	"github.com/labring/sreg/pkg/registry/sync"

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
	// run `sealctl registry serve` to start a temporary registry
	for i := range hosts {
		cmdCtx, cancel := context.WithCancel(ctx)
		// defer cancel async commands
		defer cancel()
		go func(ctx context.Context, host string) {
			logger.Debug("running temporary registry on host %s", host)
			if err := s.execer.CmdAsyncWithContext(ctx, host, getRegistryServeCommand(s.pathResolver, defaultTemporaryPort)); err != nil {
				// ignore expected signal killed error when context cancel
				if !strings.Contains(err.Error(), "signal: killed") && !strings.Contains(err.Error(), "context canceled") {
					logger.Error(err)
				}
			}
		}(cmdCtx, hosts[i])
	}

	type syncOption struct {
		target string
		typ    int
	}

	syncOptionChan := make(chan *syncOption, len(hosts))
	go func() {
		for i := range hosts {
			go func(target string) {
				probeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
				defer cancel()
				ep := sync.ParseRegistryAddress(trimPortStr(target), defaultTemporaryPort)
				if err := httputils.WaitUntilEndpointAlive(probeCtx, "http://"+ep); err != nil {
					logger.Warn("cannot connect to remote temporary registry %s: %v, fallback using ssh mode instead", ep, err)
					syncOptionChan <- &syncOption{target: target, typ: sshMode}
				} else {
					syncOptionChan <- &syncOption{target: ep, typ: httpMode}
				}
			}(hosts[i])
		}
	}()

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

func trimPortStr(s string) string {
	if idx := strings.Index(s, ":"); idx > 0 {
		return s[:idx]
	}
	return s
}

func getRegistryServeCommand(pathResolver constants.PathResolver, port string) string {
	return fmt.Sprintf("%s registry serve filesystem -p %s --disable-logging=true %s",
		pathResolver.RootFSSealctlPath(), port, pathResolver.RootFSRegistryPath(),
	)
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
