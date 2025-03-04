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

package guest

import (
	"context"
	"strings"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/fork/golang/expansion"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/maps"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

type Interface interface {
	Apply(cluster *v2.Cluster, mounts []v2.MountImage, targetHosts []string) error
	Delete(cluster *v2.Cluster) error
}

type Default struct{}

func NewGuestManager() (Interface, error) {
	return &Default{}, nil
}

func (d *Default) Apply(cluster *v2.Cluster, mounts []v2.MountImage, targetHosts []string) error {
	envGetter := env.NewEnvProcessor(cluster)
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return err
	}

	for i, m := range mounts {
		switch {
		case m.IsRootFs(), m.IsPatch():
			eg, ctx := errgroup.WithContext(context.Background())
			for j := range targetHosts {
				node := targetHosts[j]
				envs := maps.Merge(m.Env, envGetter.Getenv(node))
				cmds := formalizeImageCommands(cluster, i, m, envs)
				eg.Go(func() error {
					return execer.CmdAsyncWithContext(ctx, node,
						stringsutil.RenderShellWithEnv(strings.Join(cmds, "; "), envs),
					)
				})
			}
			if err := eg.Wait(); err != nil {
				return err
			}
		case m.IsApplication():
			// on run on the first master
			envs := maps.Merge(m.Env, envGetter.Getenv(cluster.GetMaster0IP()))
			cmds := formalizeImageCommands(cluster, i, m, envs)
			if err := execer.CmdAsync(cluster.GetMaster0IPAndPort(),
				stringsutil.RenderShellWithEnv(strings.Join(cmds, "; "), envs),
			); err != nil {
				return err
			}
		}
	}
	return nil
}

func formalizeImageCommands(cluster *v2.Cluster, index int, m v2.MountImage, extraEnvs map[string]string) []string {
	envs := maps.Merge(m.Env, extraEnvs)
	envs = v2.MergeEnvWithBuiltinKeys(envs, m)
	mapping := expansion.MappingFuncFor(envs)

	cmds := make([]string, 0)
	for i := range m.Entrypoint {
		cmds = append(cmds, FormalizeWorkingCommand(cluster.Name, m.Name, m.Type, expansion.Expand(m.Entrypoint[i], mapping)))
	}
	if index == 0 && len(cluster.Spec.Command) > 0 {
		for i := range cluster.Spec.Command {
			cmds = append(cmds, FormalizeWorkingCommand(cluster.Name, m.Name, m.Type, expansion.Expand(cluster.Spec.Command[i], mapping)))
		}
	} else {
		for i := range m.Cmd {
			cmds = append(cmds, FormalizeWorkingCommand(cluster.Name, m.Name, m.Type, expansion.Expand(m.Cmd[i], mapping)))
		}
	}

	return cmds
}

func (d Default) Delete(_ *v2.Cluster) error {
	panic("not yet implemented")
}
