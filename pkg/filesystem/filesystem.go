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
	"io/ioutil"
	"path/filepath"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/store"
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
	MountResource() error
	Clean() error
}

type FileSystem struct {
	store    store.Store
	env      env.Interface
	cluster  *v2.Cluster
	configs  []v2.Config
	resource *v2.Resource
	data     contants.Data
}

func (f *FileSystem) MountRootfs(hosts []string) error {
	return f.mountRootfs(hosts)
}

func (f *FileSystem) UnMountRootfs(hosts []string) error {
	return f.unmountRootfs(hosts)
}

func (f *FileSystem) MountResource() error {
	err := f.mountResource()
	if err != nil {
		return err
	}
	_, err = SaveClusterFile(f.cluster, f.configs, f.resource, contants.Clusterfile(f.cluster.Name))
	return err
}
func (f *FileSystem) mountResource() error {
	if err := f.store.Save(f.resource); err != nil {
		return err
	}
	return nil
}

func (f *FileSystem) Clean() error {
	return file.CleanFiles(f.data.Homedir(), contants.ClusterDir(f.cluster.Name))
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
	resources, err := decode.Resource(clusterFile)
	if err != nil {
		return nil, err
	}
	if len(resources) != 1 {
		return nil, fmt.Errorf("resource data length must is one")
	}
	disk := store.NewStore()
	envInterface := env.NewEnvProcessor(&clusters[0])

	return &FileSystem{
		store:    disk,
		env:      envInterface,
		cluster:  &clusters[0],
		configs:  configs,
		resource: &resources[0],
		data:     contants.NewData(clusterName),
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
	if f.resource == nil {
		return fmt.Errorf("get rootfs error,pelase mount MountResource after mountRootfs")
	}
	data := f.data.Homedir()
	src := f.data.RootFSPath()
	//copy rootfs
	err := collector.Download(f.resource.Status.Path, data)
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
			sshClient := ssh.NewSSHClient(&f.cluster.Spec.SSH, true)
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
	if f.resource == nil {
		return fmt.Errorf("get rootfs error,pelase mount data to  filesystem")
	}
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
			SSH := ssh.NewSSHClient(&f.cluster.Spec.SSH, true)
			if err := SSH.CmdAsync(ip, envProcessor.WrapperShell(ip, rmRootfs)); err != nil {
				return err
			}
			return nil
		})
	}
	return eg.Wait()
}
