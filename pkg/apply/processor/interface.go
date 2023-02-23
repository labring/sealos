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

	"github.com/containers/storage"
	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/filesystem/registry"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	"github.com/labring/sealos/pkg/utils/rand"
	"github.com/labring/sealos/pkg/utils/strings"
)

type Interface interface {
	// Execute :according to the different of desired cluster to do cluster apply.
	Execute(cluster *v2.Cluster) error
}

func SyncNewVersionConfig(clusterName string) {
	d := constants.NewData(clusterName)
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
	InspectImage(imgName string, opts ...string) (*buildah.InspectOutput, error)
}

func OCIToImageMount(mount *v2.MountImage, inspector imageInspector) error {
	oci, err := inspector.InspectImage(mount.ImageName)
	if err != nil {
		if errors.Is(err, storage.ErrImageUnknown) || errors.Is(err, storage.ErrNotAnImage) {
			logger.Debug("cannot find image in local storage, trying to inspect from remote")
			oci, err = inspector.InspectImage(mount.ImageName, "docker")
		}
		if err != nil {
			return err
		}
	}

	mount.Env = maps.ListToMap(oci.OCIv1.Config.Env)
	delete(mount.Env, "PATH")
	// mount.Entrypoint
	var entrypoint []string
	for _, cmd := range oci.OCIv1.Config.Entrypoint {
		if cmd == "/bin/sh" || cmd == "-c" {
			continue
		}
		entrypoint = append(entrypoint, cmd)
	}
	mount.Entrypoint = entrypoint

	//mount.Cmd
	cmds := oci.OCIv1.Config.Cmd
	var newCMDs []string
	for _, cmd := range cmds {
		if cmd == "/bin/sh" || cmd == "-c" {
			continue
		}
		newCMDs = append(newCMDs, cmd)
	}
	mount.Cmd = newCMDs
	mount.Labels = oci.OCIv1.Config.Labels
	imageType := v2.AppImage
	if mount.Labels[v2.ImageTypeKey] != "" {
		imageType = v2.ImageType(mount.Labels[v2.ImageTypeKey])
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
			return ErrCancelled
		}
	}
	return nil
}

func MirrorRegistry(cluster *v2.Cluster, mounts []v2.MountImage) error {
	registries := cluster.GetRegistryIPAndPortList()
	logger.Debug("registry nodes is: %+v", registries)
	sshClient := ssh.NewSSHClient(&cluster.Spec.SSH, true)
	mirror := registry.New(constants.NewData(cluster.GetName()).RootFSPath(), sshClient, mounts)
	return mirror.MirrorTo(context.Background(), registries...)
}

func CheckImageType(cluster *v2.Cluster, bd buildah.Interface) error {
	imageTypes := sets.NewString()
	for _, image := range cluster.Spec.Image {
		oci, err := bd.InspectImage(image)
		if err != nil {
			return err
		}
		if oci.OCIv1.Config.Labels != nil {
			imageTypes.Insert(oci.OCIv1.Config.Labels[v2.ImageTypeKey])
		} else {
			imageTypes.Insert(string(v2.AppImage))
		}
	}
	if !imageTypes.Has(string(v2.RootfsImage)) {
		return errors.New("can't apply application type images only since RootFS type image is not applied yet")
	}
	return nil
}

func getIndexOfContainerInMounts(mounts []v2.MountImage, imageName string) int {
	for idx, m := range mounts {
		if m.ImageName == imageName {
			return idx
		}
	}
	return -1
}

func MountClusterImages(cluster *v2.Cluster, bd buildah.Interface) error {
	err := bd.Pull(cluster.Spec.Image, buildah.WithPlatformOption(buildah.DefaultPlatform()),
		buildah.WithPullPolicyOption(buildah.PullIfMissing.String()))
	if err != nil {
		return err
	}
	if err := CheckImageType(cluster, bd); err != nil {
		return err
	}
	if cluster.Status.Mounts == nil {
		cluster.Status.Mounts = make([]v2.MountImage, 0)
	}
	for _, img := range cluster.Spec.Image {
		idx := getIndexOfContainerInMounts(cluster.Status.Mounts, img)
		var ctrName string
		// reuse container name
		if idx >= 0 {
			ctrName = cluster.Status.Mounts[idx].Name
		} else {
			ctrName = rand.Generator(8)
		}
		// recreate container anyway, this function call will remount the mount point of the image
		// since after the host reboot, the `merged` dir will become an empty dir when we using `overlayfs` as driver
		bderInfo, err := bd.Create(ctrName, img)
		if err != nil {
			return err
		}
		mount := &v2.MountImage{
			Name:       bderInfo.Container,
			ImageName:  img,
			MountPoint: bderInfo.MountPoint,
		}
		if err = OCIToImageMount(mount, bd); err != nil {
			return err
		}
		if idx >= 0 {
			cluster.Status.Mounts[idx] = *mount
		} else {
			cluster.Status.Mounts = append(cluster.Status.Mounts, *mount)
		}
	}
	return nil
}
