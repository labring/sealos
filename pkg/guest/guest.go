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
	"fmt"

	"github.com/fanux/sealos/fork/golang/expansion"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/image"
	"github.com/fanux/sealos/pkg/image/types"
	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/maps"
	"github.com/fanux/sealos/pkg/utils/ssh"
)

type Interface interface {
	Apply(cluster *v2.Cluster) error
	Delete(cluster *v2.Cluster) error
}

type Default struct {
	imageService types.Service
}

func NewGuestManager() (Interface, error) {
	is, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	return &Default{imageService: is}, nil
}

func (d *Default) Apply(cluster *v2.Cluster) error {
	clusterRootfs := runtime.GetContantData(cluster.Name).RootFSPath()
	img, err := d.imageService.Inspect(cluster.Spec.Image...)
	if err != nil {
		return fmt.Errorf("get cluster image failed, %s", err)
	}
	sshClient := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	envInterface := env.NewEnvProcessor(cluster, img)
	envs := envInterface.WrapperEnv(cluster.GetMaster0IP()) //clusterfile
	guestCMD := d.getGuestCmd(envs, cluster, img)
	for _, value := range guestCMD {
		if value == "" {
			continue
		}

		if err = sshClient.CmdAsync(cluster.GetMaster0IPAndPort(), fmt.Sprintf(contants.CdAndExecCmd, clusterRootfs, value)); err != nil {
			return err
		}
	}
	return nil
}

func (d *Default) getGuestCmd(envs map[string]string, cluster *v2.Cluster, images types.ImageListOCIV1) []string {
	command := make([]string, 0)
	for _, i := range images {
		if i.Config.Env != nil {
			baseEnvs := maps.ListToMap(i.Config.Env)
			envs = maps.MergeMap(baseEnvs, envs)
		}
		mapping := expansion.MappingFuncFor(envs)
		if len(i.Config.Cmd) != 0 {
			for _, cmd := range i.Config.Cmd {
				command = append(command, expansion.Expand(cmd, mapping))
			}
		}
		if len(cluster.Spec.Command) != 0 {
			for _, cmd := range cluster.Spec.Command {
				command = append(command, expansion.Expand(cmd, mapping))
			}
		}
	}

	return command
}

func (d Default) Delete(cluster *v2.Cluster) error {
	panic("implement me")
}
