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
	"errors"
	"fmt"
	"path"

	"github.com/containers/storage"
	"golang.org/x/exp/slices"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/filesystem/registry"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/maps"
	"github.com/labring/sealos/pkg/utils/rand"
)

type Interface interface {
	// Execute :according to the difference of desired cluster to do cluster apply.
	Execute(cluster *v2.Cluster) error
}

// compatible with older sealos versions
func SyncNewVersionConfig(clusterName string) {
	d := constants.NewPathResolver(clusterName)
	if !file.IsExist(d.PkiPath()) {
		src, target := path.Join(d.Root(), constants.PkiDirName), d.PkiPath()
		logger.Info("sync new version copy pki config: %s %s", src, target)
		_ = file.RecursionCopy(src, target)
	}
	if !file.IsExist(d.EtcPath()) {
		src, target := path.Join(d.Root(), constants.EtcDirName), d.EtcPath()
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
			if err = OCIToImageMount(bdah, mount); err != nil {
				return err
			}

			if reset || slices.Contains(cluster.Spec.Image, ctr.ImageName) {
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

func inspectImage(iist imageInspector, image string) (*buildah.InspectOutput, error) {
	ret, err := iist.InspectImage(image)
	if err != nil {
		if errors.Is(err, storage.ErrImageUnknown) || errors.Is(err, storage.ErrNotAnImage) {
			logger.Debug("cannot find image in local storage, trying to inspect from remote")
			ret, err = iist.InspectImage(image, "docker")
		}
	}
	return ret, err
}

func OCIToImageMount(inspector imageInspector, mount *v2.MountImage) error {
	oci, err := inspectImage(inspector, mount.ImageName)
	if err != nil {
		return err
	}

	mount.Env = maps.FromSlice(oci.OCIv1.Config.Env)
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
	typeKey := maps.GetFromKeys(mount.Labels, v2.ImageTypeKeys...)
	if typeKey != "" {
		imageType = v2.ImageType(typeKey)
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
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return err
	}
	syncer := registry.New(constants.NewPathResolver(cluster.GetName()), execer, mounts)
	return syncer.Sync(context.Background(), registries...)
}

func getIndexOfContainerInMounts(mounts []v2.MountImage, imageName string) int {
	for idx, m := range mounts {
		if m.ImageName == imageName {
			return idx
		}
	}
	return -1
}

func MountClusterImages(bdah buildah.Interface, cluster *v2.Cluster, skipApp bool) error {
	if cluster.Status.Mounts == nil {
		cluster.Status.Mounts = make([]v2.MountImage, 0)
	}
	var hasRootfsType bool
	for _, img := range cluster.Spec.Image {
		info, err := inspectImage(bdah, img)
		if err != nil {
			if skipApp {
				continue
			}
			return err
		}
		var imageType string
		if info.OCIv1.Config.Labels != nil {
			imageType = maps.GetFromKeys(info.OCIv1.Config.Labels, v2.ImageTypeKeys...)
			imageVersion := maps.GetFromKeys(info.OCIv1.Config.Labels, v2.ImageVersionKeys...)
			if imageType == string(v2.RootfsImage) {
				if !slices.Contains(v2.ImageVersionList, imageVersion) {
					return fmt.Errorf("can't apply rootfs type images and version %s not %+v",
						imageVersion, v2.ImageVersionList)
				}
				hasRootfsType = true
			}
		}
		if (imageType == "" || imageType == string(v2.AppImage)) && skipApp {
			// then it's an application type image
			continue
		}

		err = bdah.Pull([]string{img}, buildah.WithPullPolicyOption(buildah.PullIfMissing.String()))
		if err != nil {
			return err
		}
		idx := getIndexOfContainerInMounts(cluster.Status.Mounts, img)
		var ctrName string
		if idx >= 0 {
			ctrName = cluster.Status.Mounts[idx].Name
		} else {
			ctrName = rand.Generator(8)
		}
		// recreate container anyway, this function call will remount the mount point of the image
		// since after the host reboot, the `merged` dir will become an empty dir when we using `overlayfs` as driver
		bderInfo, err := bdah.Create(ctrName, img)
		if err != nil {
			return err
		}
		mount := &v2.MountImage{
			Name:       bderInfo.Container,
			ImageName:  img,
			MountPoint: bderInfo.MountPoint,
		}
		if err = OCIToImageMount(bdah, mount); err != nil {
			return err
		}
		if idx >= 0 {
			mount.Env = maps.Merge(mount.Env, cluster.Status.Mounts[idx].Env)
			cluster.Status.Mounts[idx] = *mount
		} else {
			cluster.Status.Mounts = append(cluster.Status.Mounts, *mount)
		}
	}

	if !hasRootfsType {
		return errors.New("can't apply application type images only since RootFS type image is not applied yet")
	}
	return nil
}
