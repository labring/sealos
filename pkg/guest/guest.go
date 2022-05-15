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

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/utils/exec"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/pkg/errors"
	"k8s.io/client-go/util/homedir"

	"github.com/labring/sealos/fork/golang/expansion"

	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/maps"
)

type Interface interface {
	Apply(cluster *v2.Cluster, mounts []v2.MountImage) error
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

func (d *Default) Apply(cluster *v2.Cluster, mounts []v2.MountImage) error {
	clusterRootfs := runtime.GetContantData(cluster.Name).RootFSPath()
	envInterface := env.NewEnvProcessor(cluster, cluster.Status.Mounts)
	envs := envInterface.WrapperEnv(cluster.GetMaster0IP()) //clusterfile
	guestCMD := d.getGuestCmd(envs, cluster, mounts)

	kubeConfig := filepath.Join(homedir.HomeDir(), ".kube", "config")
	if !fileutil.IsExist(kubeConfig) {
		adminFile := runtime.GetContantData(cluster.Name).AdminFile()
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

	for _, value := range guestCMD {
		if value == "" {
			continue
		}
		logger.Info("guest cmd is %s", value)
		if err := exec.Cmd("bash", "-c", fmt.Sprintf(contants.CdAndExecCmd, clusterRootfs, value)); err != nil {
			return err
		}
	}
	return nil
}

func (d *Default) getGuestCmd(envs map[string]string, cluster *v2.Cluster, mounts []v2.MountImage) []string {
	command := make([]string, 0)
	for _, i := range mounts {
		var baseEnvs map[string]string
		if i.Env != nil {
			envs = maps.MergeMap(baseEnvs, i.Env)
		}
		mapping := expansion.MappingFuncFor(envs)
		if len(i.Cmd) != 0 {
			for _, cmd := range i.Cmd {
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
