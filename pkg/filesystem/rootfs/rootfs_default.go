/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package rootfs

import (
	"context"
	"fmt"
	"os"
	"path"
	"path/filepath"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type defaultRootfs struct {
	// clusterService image.ClusterService
	// imgList types.ImageListOCIV1
	// cluster types.ClusterManifestList
	mounts []v2.MountImage
}

func (f *defaultRootfs) MountRootfs(cluster *v2.Cluster, hosts []string, initFlag, appFlag bool) error {
	return f.mountRootfs(cluster, hosts, initFlag, appFlag)
}

func (f *defaultRootfs) UnMountRootfs(cluster *v2.Cluster, hosts []string) error {
	return f.unmountRootfs(cluster, hosts)
}

func (f *defaultRootfs) getClusterName(cluster *v2.Cluster) string {
	return cluster.Name
}

func (f *defaultRootfs) getSSH(cluster *v2.Cluster) ssh.Interface {
	return ssh.NewSSHClient(&cluster.Spec.SSH, true)
}

func (f *defaultRootfs) mountRootfs(cluster *v2.Cluster, ipList []string, initFlag, appFlag bool) error {
	target := constants.NewData(f.getClusterName(cluster)).RootFSPath()
	eg, _ := errgroup.WithContext(context.Background())
	envProcessor := env.NewEnvProcessor(cluster, f.mounts)
	for _, mount := range f.mounts {
		src := mount
		eg.Go(func() error {
			if !file.IsExist(src.MountPoint) {
				logger.Debug("Image %s not exist,render env continue", src.ImageName)
				return nil
			}
			err := renderENV(src.MountPoint, ipList, envProcessor)
			if err != nil {
				return errors.Wrap(err, "render env to rootfs failed")
			}
			dirs, err := file.StatDir(src.MountPoint, true)
			if err != nil {
				return errors.Wrap(err, "get rootfs files failed")
			}
			if len(dirs) != 0 {
				_, err = exec.RunBashCmd(fmt.Sprintf(constants.DefaultChmodBash, src.MountPoint))
				if err != nil {
					return errors.Wrap(err, "run chmod to rootfs failed")
				}
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}
	check := constants.NewBash(f.getClusterName(cluster), cluster.GetImageLabels())
	sshClient := f.getSSH(cluster)
	shim := runtime.ImageShim{
		SSHInterface: sshClient,
		IP:           cluster.GetMaster0IPAndPort(),
	}
	cper := &copier{target, sshClient}
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			fileEg, _ := errgroup.WithContext(context.Background())
			for _, mount := range f.mounts {
				mountInfo := mount
				fileEg.Go(func() error {
					if mountInfo.Type == v2.RootfsImage {
						logger.Debug("send rootfs mount images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, mountInfo.ImageName, mountInfo.Type)
						err := cper.CopyFiles(ip, mountInfo.MountPoint, target, iputils.GetHostIP(ip) == cluster.GetRegistryIP())
						if err != nil {
							return fmt.Errorf("copy container %s rootfs failed %v", mountInfo.Name, err)
						}
					}
					return nil
				})
			}
			if err := fileEg.Wait(); err != nil {
				return err
			}
			for _, mountInfo := range f.mounts {
				if mountInfo.Type == v2.PatchImage {
					logger.Debug("send addons mount images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, mountInfo.ImageName, mountInfo.Type)
					err := cper.CopyFiles(ip, mountInfo.MountPoint, target, iputils.GetHostIP(ip) == cluster.GetRegistryIP())
					if err != nil {
						return fmt.Errorf("copy container %s rootfs failed %v", mountInfo.Name, err)
					}
				}
			}
			if initFlag {
				checkBash := check.CheckBash()
				if checkBash == "" {
					return nil
				}
				if err := f.getSSH(cluster).CmdAsync(ip, envProcessor.WrapperShell(ip, check.CheckBash()), shim.ApplyCMD(target)); err != nil {
					return err
				}
				if err := f.getSSH(cluster).CmdAsync(ip, envProcessor.WrapperShell(ip, check.InitBash())); err != nil {
					return err
				}
			}
			return nil
		})
	}
	err := eg.Wait()
	if err != nil {
		return err
	}

	endEg, _ := errgroup.WithContext(context.Background())
	for _, mount := range f.mounts {
		ip := cluster.GetMaster0IPAndPort()
		mountInfo := mount
		endEg.Go(func() error {
			if appFlag && mountInfo.Type == v2.AppImage {
				logger.Debug("send  app mount images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, mountInfo.ImageName, mountInfo.Type)
				err = cper.CopyFiles(ip, mountInfo.MountPoint, constants.GetAppWorkDir(cluster.Name, mountInfo.Name), iputils.GetHostIP(ip) == cluster.GetRegistryIP())
				if err != nil {
					return fmt.Errorf("copy container %s app rootfs failed %v", mountInfo.Name, err)
				}
			}
			return nil
		})
	}
	return endEg.Wait()
}

func (f *defaultRootfs) unmountRootfs(cluster *v2.Cluster, ipList []string) error {
	clusterRootfsDir := constants.NewData(f.getClusterName(cluster)).Homedir()
	rmRootfs := fmt.Sprintf("rm -rf %s", clusterRootfsDir)

	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			SSH := f.getSSH(cluster)
			return SSH.CmdAsync(ip, rmRootfs)
		})
	}
	return eg.Wait()
}

func renderENV(mountDir string, ipList []string, p env.Interface) error {
	var (
		renderEtc       = path.Join(mountDir, constants.EtcDirName)
		renderScripts   = path.Join(mountDir, constants.ScriptsDirName)
		renderManifests = path.Join(mountDir, constants.ManifestsDirName)
	)

	for _, ip := range ipList {
		for _, dir := range []string{renderEtc, renderScripts, renderManifests} {
			logger.Debug("render env dir: %s", dir)
			if file.IsExist(dir) {
				err := p.RenderAll(ip, dir)
				if err != nil {
					return err
				}
			}
		}
	}
	return nil
}

type copier struct {
	root string
	ssh  ssh.Interface
}

func (c *copier) CopyFiles(ip, src, target string, isRegistry bool) error {
	logger.Debug("copyFiles isRegistry: %v, ip: %v, src: %v, target: %v", isRegistry, ip, src, target)
	files, err := os.ReadDir(src)
	if err != nil {
		return fmt.Errorf("failed to read dir entries %s", err)
	}
	for _, f := range files {
		if f.Name() == constants.RegistryDirName {
			if !isRegistry {
				continue
			}
			target = c.root
		}
		err = c.ssh.Copy(ip, filepath.Join(src, f.Name()), filepath.Join(target, f.Name()))
		if err != nil {
			return fmt.Errorf("failed to copy sub files %v", err)
		}
	}
	return nil
}

func NewDefaultRootfs(mounts []v2.MountImage) (Interface, error) {
	return &defaultRootfs{mounts: mounts}, nil
}
