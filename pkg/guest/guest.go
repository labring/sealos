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
	"path/filepath"
	"strings"

	"github.com/pkg/errors"

	"github.com/labring/sealos/fork/golang/expansion"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/runtime"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
)

type Interface interface {
	Apply(cluster *v2.Cluster, mounts []v2.MountImage) error
	Delete(cluster *v2.Cluster) error
}

type Default struct {
}

func NewGuestManager() (Interface, error) {
	return &Default{}, nil
}

func (d *Default) Apply(cluster *v2.Cluster, mounts []v2.MountImage) error {
	envInterface := env.NewEnvProcessor(cluster, cluster.Status.Mounts)
	envs := envInterface.WrapperEnv(cluster.GetMaster0IP()) //clusterfile
	guestCMD := d.getGuestCmd(envs, cluster, mounts)

	kubeConfig := filepath.Join(constants.GetHomeDir(), ".kube", "config")
	if !fileutil.IsExist(kubeConfig) {
		adminFile := runtime.GetConstantData(cluster.Name).AdminFile()
		data, err := fileutil.ReadAll(adminFile)
		if err != nil {
			return errors.Wrap(err, "read admin.conf error in guest")
		}
		master0IP := cluster.GetMaster0IP()
		outData := strings.ReplaceAll(string(data), runtime.DefaultAPIServerDomain, master0IP)
		if err = fileutil.WriteFile(kubeConfig, []byte(outData)); err != nil {
			return err
		}
		defer func() {
			_ = fileutil.CleanFiles(kubeConfig)
		}()
	}
	sshInterface := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	logger.Debug("start to exec guest commands")
	if err := sshInterface.CmdAsync(cluster.GetMaster0IPAndPort(), guestCMD...); err != nil {
		return err
	}
	logger.Debug("finish to exec guest commands: %v", guestCMD)
	return nil
}

func (d *Default) getGuestCmd(envs map[string]string, cluster *v2.Cluster, mounts []v2.MountImage) []string {
	command := make([]string, 0)
	overrideCmd := cluster.Spec.Command
	workCmd := func(applicationName, cmd string, t v2.ImageType) string {
		if t == v2.RootfsImage {
			return fmt.Sprintf(constants.CdAndExecCmd, constants.GetRootWorkDir(cluster.Name), cmd)
		}
		return fmt.Sprintf(constants.CdAndExecCmd, constants.GetAppWorkDir(cluster.Name, applicationName), cmd)
	}
	for idx, i := range mounts {
		if i.Type != v2.AppImage && i.Type != v2.RootfsImage {
			continue
		}
		mergeENV := maps.MergeMap(i.Env, envs)
		mapping := expansion.MappingFuncFor(mergeENV)
		for _, cmd := range i.Entrypoint {
			command = append(command, workCmd(i.Name, expansion.Expand(cmd, mapping), i.Type))
		}

		// if --cmd is specified, only the CMD of the first MountImage will be overridden
		if idx == 0 && len(overrideCmd) > 0 {
			for _, cmd := range overrideCmd {
				command = append(command, workCmd(i.Name, expansion.Expand(cmd, mapping), i.Type))
			}
			continue
		}

		for _, cmd := range i.Cmd {
			command = append(command, workCmd(i.Name, expansion.Expand(cmd, mapping), i.Type))
		}
	}

	return command
}

func (d Default) Delete(cluster *v2.Cluster) error {
	panic("implement me")
}
