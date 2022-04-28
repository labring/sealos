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

	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/utils/exec"
	fileutil "github.com/fanux/sealos/pkg/utils/file"
	"github.com/pkg/errors"
	"k8s.io/client-go/util/homedir"

	"github.com/fanux/sealos/fork/golang/expansion"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/image"
	"github.com/fanux/sealos/pkg/image/types"
	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/maps"
)

type Interface interface {
	Apply(cluster *v2.Cluster, images []string) error
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

func (d *Default) Apply(cluster *v2.Cluster, images []string) error {
	clusterRootfs := runtime.GetContantData(cluster.Name).RootFSPath()
	img, err := d.imageService.Inspect(images...)
	if err != nil {
		return fmt.Errorf("get cluster image failed, %s", err)
	}
	envInterface := env.NewEnvProcessor(cluster, img)
	envs := envInterface.WrapperEnv(cluster.GetMaster0IP()) //clusterfile
	guestCMD := d.getGuestCmd(envs, cluster, img)

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
		//TODO temp solve it
		if value == "" || value == "/bin/sh" || value == "-c" {
			continue
		}
		logger.Debug("guest cmd is %s", value)
		if err = exec.Cmd("bash", "-c", fmt.Sprintf(contants.CdAndExecCmd, clusterRootfs, value)); err != nil {
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
