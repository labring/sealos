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

	"github.com/fanux/sealos/pkg/utils/iputils"

	"github.com/fanux/sealos/pkg/runtime"

	"github.com/fanux/sealos/pkg/utils/logger"

	"github.com/fanux/sealos/pkg/image/types"

	"github.com/fanux/sealos/pkg/env"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
)

type defaultRootfs struct {
	//clusterService image.ClusterService
	imgList types.ImageListOCIV1
	cluster types.ClusterManifestList
}

func (f *defaultRootfs) MountRootfs(cluster *v2.Cluster, hosts []string, initFlag bool) error {
	return f.mountRootfs(cluster, hosts, initFlag)
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

func (f *defaultRootfs) mountRootfs(cluster *v2.Cluster, ipList []string, initFlag bool) error {
	target := contants.NewData(f.getClusterName(cluster)).RootFSPath()
	eg, _ := errgroup.WithContext(context.Background())
	envProcessor := env.NewEnvProcessor(cluster, f.imgList)

	for _, cInfo := range f.cluster {
		src := cInfo
		eg.Go(func() error {
			err := renderENV(src.MountPoint, ipList, envProcessor)
			if err != nil {
				return errors.Wrap(err, "render env to rootfs failed")
			}

			_, err = exec.RunBashCmd(fmt.Sprintf(contants.DefaultChmodBash, src.MountPoint))
			if err != nil {
				return errors.Wrap(err, "run chmod to rootfs failed")
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return err
	}
	check := contants.NewBash(f.getClusterName(cluster), runtime.GetImageLabels(f.imgList))

	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			sshClient := f.getSSH(cluster)
			fileEg, _ := errgroup.WithContext(context.Background())
			for _, cInfo := range f.cluster {
				cInfo := cInfo
				fileEg.Go(func() error {
					err := CopyFiles(sshClient, iputils.GetHostIP(ip) == cluster.GetMaster0IP(), ip, cInfo.MountPoint, target)
					if err != nil {
						return fmt.Errorf("copy container %s rootfs failed %v", cInfo.Container, err)
					}
					return nil
				})
			}
			if err := fileEg.Wait(); err != nil {
				return err
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
	return eg.Wait()
}
func (f *defaultRootfs) unmountRootfs(cluster *v2.Cluster, ipList []string) error {
	clusterRootfsDir := contants.NewData(f.getClusterName(cluster)).Homedir()
	rmRootfs := fmt.Sprintf("rm -rf %s", clusterRootfsDir)

	_, err := exec.RunBashCmd(rmRootfs)
	if err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			SSH := f.getSSH(cluster)
			if err := SSH.CmdAsync(ip, rmRootfs); err != nil {
				return err
			}
			return nil
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}
	return nil
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
func CopyFiles(sshEntry ssh.Interface, isRegistry bool, ip, src, target string) error {
	files, err := ioutil.ReadDir(src)
	if err != nil {
		return fmt.Errorf("failed to copy files %s", err)
	}

	if isRegistry {
		return sshEntry.Copy(ip, src, target)
	}
	for _, f := range files {
		if f.Name() == contants.RegistryDirName {
			continue
		}
		err = sshEntry.Copy(ip, filepath.Join(src, f.Name()), filepath.Join(target, f.Name()))
		if err != nil {
			return fmt.Errorf("failed to copy sub files %v", err)
		}
	}
	return nil
}

func NewDefaultRootfs(cluster types.ClusterManifestList, images types.ImageListOCIV1) (Interface, error) {
	return &defaultRootfs{cluster: cluster, imgList: images}, nil
}
