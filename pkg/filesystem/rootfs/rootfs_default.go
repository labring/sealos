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
	"io/ioutil"
	"path"
	"path/filepath"

	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/labring/sealos/pkg/runtime"

	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/env"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/exec"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/ssh"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
)

type defaultRootfs struct {
	//clusterService image.ClusterService
	//imgList types.ImageListOCIV1
	//cluster types.ClusterManifestList
	images []v2.MountImage
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
	target := contants.NewData(f.getClusterName(cluster)).RootFSPath()
	eg, _ := errgroup.WithContext(context.Background())
	envProcessor := env.NewEnvProcessor(cluster, f.images)

	for _, cInfo := range f.images {
		src := cInfo
		eg.Go(func() error {
			if initFlag && src.Type == v2.AppImage {
				logger.Debug("ApplicationImage %s render env init process continue", src.ImageName)
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
				_, err = exec.RunBashCmd(fmt.Sprintf(contants.DefaultChmodBash, src.MountPoint))
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
	check := contants.NewBash(f.getClusterName(cluster), cluster.GetImageLabels())
	sshClient := f.getSSH(cluster)
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			fileEg, _ := errgroup.WithContext(context.Background())
			for _, cInfo := range f.images {
				cInfo := cInfo
				fileEg.Go(func() error {
					if cInfo.Type == v2.RootfsImage {
						logger.Debug("send rootfs images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, cInfo.ImageName, cInfo.Type)
						err := CopyFiles(sshClient, iputils.GetHostIP(ip) == cluster.GetMaster0IP(), false, ip, cInfo.MountPoint, target)
						if err != nil {
							return fmt.Errorf("copy container %s rootfs failed %v", cInfo.Name, err)
						}
					}
					return nil
				})
			}
			if err := fileEg.Wait(); err != nil {
				return err
			}
			for _, cInfo := range f.images {
				if cInfo.Type == v2.AddonsImage {
					logger.Debug("send addons images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, cInfo.ImageName, cInfo.Type)
					err := CopyFiles(sshClient, iputils.GetHostIP(ip) == cluster.GetMaster0IP(), false, ip, cInfo.MountPoint, target)
					if err != nil {
						return fmt.Errorf("copy container %s rootfs failed %v", cInfo.Name, err)
					}
				}
			}
			if initFlag {
				checkBash := check.CheckBash()
				if checkBash == "" {
					return nil
				}
				if err := f.getSSH(cluster).CmdAsync(ip, envProcessor.WrapperShell(ip, check.CheckBash()), runtime.ApplyImageShimCMD(target)); err != nil {
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
	for _, cInfo := range f.images {
		ip := cluster.GetMaster0IP()
		endEg.Go(func() error {
			if cInfo.Type == v2.AppImage {
				logger.Debug("send  app images ,ip: %s , init flag: %v, app flag: %v,image name: %s, image type: %s", ip, initFlag, appFlag, cInfo.ImageName, cInfo.Type)
				err = CopyFiles(sshClient, iputils.GetHostIP(ip) == cluster.GetMaster0IP(), true, ip, cInfo.MountPoint, target)
				if err != nil {
					return fmt.Errorf("copy container %s rootfs failed %v", cInfo.Name, err)
				}
			}
			return nil
		})
	}
	return endEg.Wait()
}
func (f *defaultRootfs) unmountRootfs(cluster *v2.Cluster, ipList []string) error {
	clusterRootfsDir := contants.NewData(f.getClusterName(cluster)).Homedir()
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
		renderEtc       = path.Join(mountDir, contants.EtcDirName)
		renderChart     = path.Join(mountDir, contants.ChartsDirName)
		renderManifests = path.Join(mountDir, contants.ManifestsDirName)
	)

	for _, ip := range ipList {
		for _, dir := range []string{renderEtc, renderChart, renderManifests} {
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
func CopyFiles(sshEntry ssh.Interface, isRegistry, isApp bool, ip, src, target string) error {
	files, err := ioutil.ReadDir(src)
	if err != nil {
		return fmt.Errorf("failed to copy files %s", err)
	}

	if isRegistry {
		return sshEntry.Copy(ip, src, target)
	}
	targetIP := ip
	if isApp {
		targetIP = "127.0.0.1"
	}
	for _, f := range files {
		if f.Name() == contants.RegistryDirName {
			continue
		}
		err = sshEntry.Copy(targetIP, filepath.Join(src, f.Name()), filepath.Join(target, f.Name()))
		if err != nil {
			return fmt.Errorf("failed to copy sub files %v", err)
		}
	}
	return nil
}

func NewDefaultRootfs(images []v2.MountImage) (Interface, error) {
	return &defaultRootfs{images: images}, nil
}
