// Copyright © 2022 sealos.
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

package bootstrap

import (
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/maps"
	stringsutil "github.com/labring/sealos/pkg/utils/strings"
)

type Context interface {
	GetBash() constants.Bash
	GetCluster() *v2.Cluster
	GetPathResolver() constants.PathResolver
	GetExecer() exec.Interface
	GetRemoter() *ssh.Remote
}

type realContext struct {
	bash         constants.Bash
	cluster      *v2.Cluster
	pathResolver constants.PathResolver
	execer       exec.Interface
	remoter      *ssh.Remote
}

func (ctx realContext) GetBash() constants.Bash {
	return ctx.bash
}

func (ctx realContext) GetCluster() *v2.Cluster {
	return ctx.cluster
}

func (ctx realContext) GetPathResolver() constants.PathResolver {
	return ctx.pathResolver
}

func (ctx realContext) GetExecer() exec.Interface {
	return ctx.execer
}

func (ctx realContext) GetRemoter() *ssh.Remote {
	return ctx.remoter
}

func NewContextFrom(cluster *v2.Cluster) Context {
	execer := ssh.NewCacheClientFromCluster(cluster, true)
	// if we can get this far, ignore error is ok
	execer, _ = exec.New(execer)
	envProcessor := env.NewEnvProcessor(cluster)
	remoter := ssh.NewRemoteFromSSH(cluster.GetName(), execer)

	rootfsImage := cluster.GetRootfsImage()
	rootfsEnvs := v2.MergeEnvWithBuiltinKeys(rootfsImage.Env, *rootfsImage)

	// bootstrap process depends on the envs in the rootfs image
	shellWrapper := func(host, shell string) string {
		envs := maps.Merge(rootfsEnvs, envProcessor.Getenv(host))
		return stringsutil.RenderShellWithEnv(shell, envs)
	}
	return &realContext{
		cluster:      cluster,
		execer:       execer,
		bash:         constants.NewBash(cluster.GetName(), cluster.GetAllLabels(), shellWrapper),
		pathResolver: constants.NewPathResolver(cluster.GetName()),
		remoter:      remoter,
	}
}
