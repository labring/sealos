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

package processor

import (
	"path"

	"github.com/labring/sealos/pkg/utils/file"
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	"github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/image/types"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type Interface interface {
	// Execute :according to the different of desired cluster to do cluster apply.
	Execute(cluster *v2.Cluster) error
}

func SyncNewVersionConfig(cluster *v2.Cluster) {
	d := constants.NewData(cluster.Name)
	if !file.IsExist(d.PkiPath()) {
		src, target := path.Join(d.Homedir(), constants.PkiDirName), d.PkiPath()
		logger.Info("sync new version copy pki config: %s %s", src, target)
		_ = file.RecursionCopy(src, target)
	}
	if !file.IsExist(d.EtcPath()) {
		src, target := path.Join(d.Homedir(), constants.EtcDirName), d.EtcPath()
		logger.Info("sync new version copy etc config: %s %s", src, target)
		_ = file.RecursionCopy(src, target)
	}
}

func SyncClusterStatus(cluster *v2.Cluster, service types.ClusterService, imgService types.ImageService, reset bool) error {
	if cluster.Status.Mounts == nil {
		containers, err := service.List()
		if err != nil {
			return err
		}
		cluster.Status.Mounts = make([]v2.MountImage, 0)
		for _, info := range containers {
			manifest, err := service.Inspect(info.Containername)
			if err != nil {
				return err
			}
			mount := &v2.MountImage{
				MountPoint: manifest.MountPoint,
				ImageName:  info.Imagename,
				Name:       info.Containername,
			}
			if err = OCIToImageMount(mount, imgService); err != nil {
				return err
			}

			if reset || strings.InList(info.Imagename, cluster.Spec.Image) {
				cluster.Status.Mounts = append(cluster.Status.Mounts, *mount)
			}
		}
	}
	logger.Debug("sync cluster status is: %s", cluster.String())
	return nil
}

func OCIToImageMount(mount *v2.MountImage, imgService types.ImageService) error {
	oci, err := imgService.Inspect(mount.ImageName)
	if err != nil {
		return err
	}
	if len(oci) > 0 {
		mount.Env = maps.ListToMap(oci[0].Config.Env)
		delete(mount.Env, "PATH")
		// mount.Entrypoint
		var entrypoint []string
		for _, cmd := range oci[0].Config.Entrypoint {
			if cmd == "/bin/sh" || cmd == "-c" {
				continue
			}
			entrypoint = append(entrypoint, cmd)
		}
		mount.Entrypoint = entrypoint

		//mount.Cmd
		cmds := oci[0].Config.Cmd
		var newCMDs []string
		for _, cmd := range cmds {
			if cmd == "/bin/sh" || cmd == "-c" {
				continue
			}
			newCMDs = append(newCMDs, cmd)
		}
		mount.Cmd = newCMDs
		mount.Labels = oci[0].Config.Labels
		imageType := v2.AppImage
		if mount.Labels[constants.ImageTypeKey] != "" {
			imageType = v2.ImageType(mount.Labels[constants.ImageTypeKey])
		}
		mount.Type = imageType
	}
	return nil
}

func ConfirmDeleteNodes() error {
	if !ForceDelete {
		prompt := "are you sure to delete these nodes?"
		cancel := "you have canceled to delete these nodes !"
		if pass, err := confirm.Confirm(prompt, cancel); err != nil {
			return err
		} else if !pass {
			return errors.New(cancel)
		}
	}
	return nil
}
