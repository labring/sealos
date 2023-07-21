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
	"github.com/labring/sealos/pkg/remote"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Context interface {
	GetBash() constants.Bash
	GetCluster() *v2.Cluster
	GetData() constants.Data
	GetExecer() ssh.Interface
	GetRemoter() remote.Interface
}

type realContext struct {
	bash    constants.Bash
	cluster *v2.Cluster
	data    constants.Data
	execer  ssh.Interface
	remoter remote.Interface
}

func (ctx realContext) GetBash() constants.Bash {
	return ctx.bash
}

func (ctx realContext) GetCluster() *v2.Cluster {
	return ctx.cluster
}

func (ctx realContext) GetData() constants.Data {
	return ctx.data
}

func (ctx realContext) GetExecer() ssh.Interface {
	return ctx.execer
}

func (ctx realContext) GetRemoter() remote.Interface {
	return ctx.remoter
}

func NewContextFrom(cluster, current *v2.Cluster) Context {
	execer := ssh.NewClusterClient(cluster, current, true)
	envProcessor := env.NewEnvProcessor(cluster, cluster.Status.Mounts)
	remoter := remote.New(cluster.GetName(), execer)
	return &realContext{
		cluster: cluster,
		execer:  execer,
		bash:    constants.NewBash(cluster.GetName(), cluster.GetImageLabels(), envProcessor.WrapperShell),
		data:    constants.NewData(cluster.GetName()),
		remoter: remoter,
	}
}
