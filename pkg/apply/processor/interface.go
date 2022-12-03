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
	"context"
	"path"

	v1 "github.com/opencontainers/image-spec/specs-go/v1"
	"github.com/pkg/errors"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/filesystem/registry"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	"github.com/labring/sealos/pkg/utils/strings"
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

func SyncClusterStatus(cluster *v2.Cluster, bdah buildah.Interface, reset bool) error {
	if cluster.Status.Mounts == nil {
		containers, err := bdah.ListContainers()
		if err != nil {
			return err
		}
		cluster.Status.Mounts = make([]v2.MountImage, 0)
		for _, ctr := range containers {
			bderInfo, err := bdah.InspectContainer(ctr.ContainerName)
			if err != nil {
				return err
			}
			mount := &v2.MountImage{
				MountPoint: bderInfo.MountPoint,
				ImageName:  ctr.ImageName,
				Name:       ctr.ContainerName,
			}
			if err = OCIToImageMount(mount, bdah); err != nil {
				return err
			}

			if reset || strings.InList(ctr.ImageName, cluster.Spec.Image) {
				cluster.Status.Mounts = append(cluster.Status.Mounts, *mount)
			}
		}
	}
	logger.Debug("sync cluster status is: %s", cluster.String())
	return nil
}

type imageInspector interface {
	InspectImage(string) (v1.Image, error)
}

func OCIToImageMount(mount *v2.MountImage, inspector imageInspector) error {
	oci, err := inspector.InspectImage(mount.ImageName)
	if err != nil {
		return err
	}

	mount.Env = maps.ListToMap(oci.Config.Env)
	delete(mount.Env, "PATH")
	// mount.Entrypoint
	var entrypoint []string
	for _, cmd := range oci.Config.Entrypoint {
		if cmd == "/bin/sh" || cmd == "-c" {
			continue
		}
		entrypoint = append(entrypoint, cmd)
	}
	mount.Entrypoint = entrypoint

	//mount.Cmd
	cmds := oci.Config.Cmd
	var newCMDs []string
	for _, cmd := range cmds {
		if cmd == "/bin/sh" || cmd == "-c" {
			continue
		}
		newCMDs = append(newCMDs, cmd)
	}
	mount.Cmd = newCMDs
	mount.Labels = oci.Config.Labels
	imageType := v2.AppImage
	if mount.Labels[constants.ImageTypeKey] != "" {
		imageType = v2.ImageType(mount.Labels[constants.ImageTypeKey])
	}
	mount.Type = imageType
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

func MirrorRegistry(cluster *v2.Cluster, mounts []v2.MountImage) error {
	registries := cluster.GetRegistryIPAndPortList()
	sshClient := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	mirror := registry.New(constants.NewData(cluster.GetName()).RootFSPath(), sshClient, mounts)
	return mirror.MirrorTo(context.Background(), registries...)
}
