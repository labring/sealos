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
	"io"
	"path/filepath"
	"time"

	"github.com/labring/sealos/pkg/registry/sync"

	"github.com/containers/common/pkg/auth"
	"github.com/containers/image/v5/copy"
	"github.com/containers/image/v5/types"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/registry/handler"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	localhost            = "127.0.0.1"
	defaultTemporaryPort = "5050"
)

// TODO: fallback to ssh mode when HTTP is not available
type syncMode struct {
	pathResolver PathResolver
	ssh          ssh.Interface
	mounts       []v2.MountImage
}

func (s *syncMode) Sync(ctx context.Context, hosts ...string) error {
	sys := &types.SystemContext{
		DockerInsecureSkipTLSVerify: types.OptionalBoolTrue,
	}
	// run `sealctl registry serve` to start a temporary registry
	for i := range hosts {
		ctx, cancel := context.WithCancel(ctx)
		// defer cancel async commands
		defer cancel()
		go func(ctx context.Context, host string) {
			logger.Debug("running temporary registry on host %s", host)
			if err := s.ssh.CmdAsyncWithContext(ctx, host, getRegistryServeCommand(s.pathResolver, defaultTemporaryPort)); err != nil {
				logger.Error(err)
			}
		}(ctx, hosts[i])
	}

	var endpoints []string
	for i := range hosts {
		ep, err := sync.ParseRegistryAddress(hosts[i], defaultTemporaryPort)
		if err != nil {
			return err
		}
		if !sync.WaitUntilHTTPListen("http://"+ep, time.Second*3) {
			return fmt.Errorf("cannot detect whether registry %s is listening, check manually", ep)
		}
		endpoints = append(endpoints, ep)
	}

	outerEg, ctx := errgroup.WithContext(ctx)
	for i := range s.mounts {
		mount := s.mounts[i]
		outerEg.Go(func() error {
			config, err := handler.NewConfig(
				filepath.Join(mount.MountPoint, constants.RegistryDirName), 0)
			if err != nil {
				return err
			}
			config.Log.AccessLog.Disabled = true
			errCh := handler.Run(ctx, config)
			eg, _ := errgroup.WithContext(ctx)
			for j := range endpoints {
				dst := endpoints[j]
				eg.Go(func() error {
					src, err := sync.ParseRegistryAddress(localhost, config.HTTP.Addr)
					if err != nil {
						return err
					}
					return sync.Image(ctx, sys, src, dst, copy.CopyAllImages)
				})
			}
			go func() {
				errCh <- eg.Wait()
			}()
			return <-errCh
		})
	}
	return outerEg.Wait()
}

func getRegistryServeCommand(pathResolver PathResolver, port string) string {
	return fmt.Sprintf("%s registry serve filesystem -p %s --disable-logging=true %s",
		pathResolver.RootFSSealctlPath(), port, pathResolver.RootFSRegistryPath(),
	)
}

//lint:ignore U1000 Ignore unused function temporarily for debugging
func loginRegistry(ctx context.Context, sys *types.SystemContext, username, password, registry string) error {
	return auth.Login(ctx, sys, &auth.LoginOptions{
		Username: username,
		Password: password,
		Stdout:   io.Discard,
	}, []string{registry})
}
