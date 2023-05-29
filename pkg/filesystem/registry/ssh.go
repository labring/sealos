/*
Copyright 2022 fengxsong@outlook.com

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
	"strconv"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/system"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
)

type sshMode struct {
	pathResolver PathResolver
	ssh          ssh.Interface
	mounts       []v2.MountImage
}

func (s *sshMode) Sync(ctx context.Context, hosts ...string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	outerEg, _ := errgroup.WithContext(ctx)
	for i := range hosts {
		host := hosts[i]
		outerEg.Go(func() error {
			eg, _ := errgroup.WithContext(ctx)
			for j := range s.mounts {
				m := s.mounts[j]
				eg.Go(func() error {
					return ssh.CopyDir(s.ssh, host,
						m.MountPoint,
						s.pathResolver.RootFSPath(),
						constants.IsRegistryDir)
				})
			}
			if err := eg.Wait(); err != nil {
				return err
			}
			return s.ssh.CmdAsync(host, getUntarCommands(s.pathResolver))
		})
	}
	return outerEg.Wait()
}

type PathResolver interface {
	RootFSSealctlPath() string
	RootFSRegistryPath() string
	RootFSPath() string
}

func getUntarCommands(pathResolver PathResolver) string {
	return fmt.Sprintf(`%[1]s untar -h > /dev/null 2>&1 \
	&& %[1]s untar -o %s --debug=%s --clear=true %s \
	|| (echo 'skip decompressing registry contents')`,
		pathResolver.RootFSSealctlPath(),
		filepath.Join(pathResolver.RootFSPath(), "registry", "docker"),
		strconv.FormatBool(logger.IsDebugMode()),
		filepath.Join(pathResolver.RootFSPath(), "registry", "compressed"),
	)
}

func New(pathResolver PathResolver, ssh ssh.Interface, mounts []v2.MountImage) filesystem.RegistrySyncer {
	if v, _ := system.Get(system.RegistrySyncExperimentalConfigKey); v == "true" {
		return &syncMode{pathResolver, ssh, mounts}
	}
	return &sshMode{pathResolver, ssh, mounts}
}
