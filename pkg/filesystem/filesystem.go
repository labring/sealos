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

package filesystem

import (
	"context"
	"fmt"
	"github.com/fanux/sealos/pkg/utils/collector"
	"github.com/pkg/errors"
	"io/ioutil"
	"path/filepath"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/image"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"golang.org/x/sync/errgroup"
)

type Interface interface {
	MountRootfs(hosts []string) error
	UnMountRootfs(hosts []string) error
	MountWorkingContainer() error
	UnMountWorkingContainer() error
}

type FileSystem struct {
	imageService image.Service
	env          env.Interface
	cluster      *v2.Cluster
	configs      []v2.Config
	data         contants.Data
}

func (f *FileSystem) MountRootfs(hosts []string) error {
	return f.mountRootfs(hosts)
}

func (f *FileSystem) UnMountRootfs(hosts []string) error {
	return f.unmountRootfs(hosts)
}

func (f *FileSystem) MountWorkingContainer() error {
	err := f.mountWorkingContainer()
	if err != nil {
		return err
	}
	_, err = SaveClusterFile(f.cluster, f.configs, contants.Clusterfile(f.getClusterName()))
	return err
}
func (f *FileSystem) mountWorkingContainer() error {
	if err := f.imageService.PullIfNotExist(f.getImageName()); err != nil {
		return err
	}
	if err := f.imageService.CreateCluster(f.getImageName(), f.getClusterName()); err != nil {
		return err
	}

	return nil
}

func (f *FileSystem) UnMountWorkingContainer() error {
	return file.CleanFiles(f.data.Homedir(), contants.ClusterDir(f.getClusterName()))
}

func NewFilesystem(clusterName string) (Interface, error) {
	clusterFile := contants.Clusterfile(clusterName)
	clusters, err := decode.Cluster(clusterFile)
	if err != nil {
		return nil, err
	}
	if len(clusters) != 1 {
		return nil, fmt.Errorf("cluster data length must is one")
	}
	configs, err := decode.Configs(clusterFile)
	if err != nil {
		return nil, err
	}
	disk, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	envInterface := env.NewEnvProcessor(&clusters[0])

	return &FileSystem{
		imageService: disk,
		env:          envInterface,
		cluster:      &clusters[0],
		configs:      configs,
		data:         contants.NewData(clusterName),
	}, nil
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

func (f *FileSystem) mountRootfs(ipList []string) error {
	src := f.data.RootFSPath()
	data, err := f.imageService.Inspect(f.getClusterName())
	if err != nil {
		return errors.Wrap(err, fmt.Sprintf("inspect container %s data failed", f.getClusterName()))
	}
	//copy rootfs
	err = collector.Download(data.MountPoint, src)
	if err != nil {
		return err
	}

	err = renderENV(src, ipList, f.env)
	if err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			target := f.data.RootFSPath()
			sshClient := f.getSSH()
			//TODO is host ip
			if ip == "" {
				return nil
			}

			err := CopyFiles(sshClient, ip == f.cluster.GetMaster0IP(), ip, src, target)
			if err != nil {
				return fmt.Errorf("copy rootfs failed %v", err)
			}
			return err
		})
	}
	return eg.Wait()
}
func (f *FileSystem) unmountRootfs(ipList []string) error {
	clusterRootfsDir := f.data.Homedir()
	rmRootfs := fmt.Sprintf("rm -rf %s", clusterRootfsDir)

	_, err := exec.RunBashCmd(rmRootfs)
	if err != nil {
		return err
	}
	envProcessor := env.NewEnvProcessor(f.cluster)
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			SSH := f.getSSH()
			if err := SSH.CmdAsync(ip, envProcessor.WrapperShell(ip, rmRootfs)); err != nil {
				return err
			}
			return nil
		})
	}
	return eg.Wait()
}
