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

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Interface interface {
	MirrorTo(context.Context, ...string) error
}

type scp struct {
	root   string
	ssh    ssh.Interface
	mounts []v2.MountImage
}

func (s *scp) MirrorTo(ctx context.Context, hosts ...string) error {
	if ctx == nil {
		ctx = context.Background()
	}
	eg, _ := errgroup.WithContext(ctx)
	for i := range s.mounts {
		m := s.mounts[i]
		for j := range hosts {
			host := hosts[j]
			eg.Go(func() error {
				return ssh.CopyDir(s.ssh, host, m.MountPoint, s.root, constants.IsRegistryDir)
			})
		}
	}
	return eg.Wait()
}

func New(root string, ssh ssh.Interface, mounts []v2.MountImage) Interface {
	return &scp{root, ssh, mounts}
}
