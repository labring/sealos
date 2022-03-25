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

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/image"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
)

type defaultRootfs struct {
	clusterService image.ClusterService
}

func (f *defaultRootfs) MountRootfs(cluster *v2.Cluster, hosts []string) error {
	return f.mountRootfs(cluster, hosts)
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

func (f *defaultRootfs) mountRootfs(cluster *v2.Cluster, ipList []string) error {
	target := contants.NewData(f.getClusterName(cluster)).RootFSPath()
	data, err := f.clusterService.Inspect(f.getClusterName(cluster))
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("inspect container %s data failed", f.getClusterName(cluster)))
	}
	src := data.MountPoint
	envProcessor := env.NewEnvProcessor(cluster)
	err = renderENV(src, ipList, envProcessor)
	if err != nil {
		return errors.Wrap(err, "render env to rootfs failed")
	}
	_, err = exec.RunBashCmd(fmt.Sprintf(contants.DefaultChmodBash, src))
	if err != nil {
		return errors.Wrap(err, "run chmod to rootfs failed")
	}

	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			sshClient := f.getSSH(cluster)
			err := CopyFiles(sshClient, ip == cluster.GetMaster0IP(), ip, src, target)
			if err != nil {
				return fmt.Errorf("copy rootfs failed %v", err)
			}
			return err
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
	envProcessor := env.NewEnvProcessor(cluster)
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			SSH := f.getSSH(cluster)
			if err := SSH.CmdAsync(ip, envProcessor.WrapperShell(ip, rmRootfs)); err != nil {
				return err
			}
			return nil
		})
	}
	if err = eg.Wait(); err != nil {
		return err
	}
	return f.clusterService.Delete(f.getClusterName(cluster))
}

func renderENV(mountDir string, ipList []string, p env.Interface) error {
	var (
		baseRawPath     = path.Join(mountDir, contants.DataDirName)
		renderEtc       = path.Join(baseRawPath, contants.EtcDirName)
		renderChart     = path.Join(baseRawPath, contants.ChartsDirName)
		renderManifests = path.Join(baseRawPath, contants.ManifestsDirName)
	)

	for _, ip := range ipList {
		for _, dir := range []string{renderEtc, renderChart, renderManifests} {
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

func NewDefaultRootfs(service image.ClusterService) (Interface, error) {
	return &defaultRootfs{clusterService: service}, nil
}
