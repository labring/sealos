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
	"io/ioutil"
	"path"
	"path/filepath"

	"github.com/fanux/sealos/pkg/config"
	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/store"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/archive"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/exec"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"golang.org/x/sync/errgroup"
)

type Interface interface {
	MountRootfs(hosts []string, initFlag bool) error
	UnMountRootfs(hosts []string) error
	MountResource() error
	Clean() error
}

type FileSystem struct {
	store     store.Store
	env       env.Interface
	cluster   *v2.Cluster
	configs   []v2.Config
	resources []v2.Resource
	data      contants.Data
	work      contants.Worker
}

func (f *FileSystem) MountRootfs(hosts []string, initFlag bool) error {
	return f.mountRootfs(hosts, initFlag)
}

func (f *FileSystem) UnMountRootfs(hosts []string) error {
	return f.unmountRootfs(hosts)
}

func (f *FileSystem) MountResource() error {
	var replaces []v2.Resource
	for i, r := range f.resources {
		if err := f.store.Save(&r); err != nil {
			return err
		}
		statusPath := r.Status.Path
		if r.Spec.Type == v2.KubernetesTarGz {
			arch := archive.NewArchive(false, false)
			digest, _, err := arch.Digest(statusPath)
			if err != nil {
				return err
			}
			md5Dir := path.Join(contants.ResourcePath(), digest.String())
			if err = file.CopyDir(r.Status.Path, md5Dir, false); err != nil {
				return err
			}
			statusPath = md5Dir
			cfg := config.NewConfiguration(path.Join(statusPath, contants.DataDirName), f.configs)
			if err := cfg.Dump(""); err != nil {
				return err
			}
		}
		switch r.Spec.Type {
		case v2.KubernetesTarGz:
			cfg := config.NewConfiguration(path.Join(statusPath, contants.DataDirName), f.configs)
			if err := cfg.Dump(""); err != nil {
				return err
			}
			for _, replace := range replaces {
				if replace.Status.Arch == r.Status.Arch {
					if _, err := file.CopySingleFile(replace.Status.Path, path.Join(statusPath, contants.DataDirName, replace.Spec.Override)); err != nil {
						return err
					}
				}
			}
			if _, err := exec.RunBashCmd(fmt.Sprintf(contants.DefaultChmodBash, path.Join(statusPath, contants.DataDirName))); err != nil {
				return err
			}

			renderEtc := f.data.KubeEtcPath()
			renderChart := f.data.KubeCharsPath()
			renderManifests := f.data.KubeManifestsPath()
			for _, dir := range []string{renderEtc, renderChart, renderManifests} {
				if file.IsExist(dir) {
					err := f.env.RenderAll("", dir)
					if err != nil {
						return err
					}
				}
			}

		case v2.FileBinary:
			replaces = append(replaces, r)
		}
		r.Status.RawPath = statusPath
		f.resources[i] = r
	}
	_, err := SaveClusterFile(f.cluster, f.configs, f.resources, f.work.Clusterfile())
	return err
}

func (f *FileSystem) Clean() error {
	return file.CleanFiles(f.data.Homedir(), f.work.Homedir())

}

func NewFilesystem(clusterName string) (Interface, error) {
	work := contants.NewWork(clusterName)
	clusterFile := work.Clusterfile()
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
	disk := store.NewStore(clusterName)
	envInterface := env.NewEnvProcessor(&clusters[0])

	return &FileSystem{
		store:     disk,
		env:       envInterface,
		cluster:   &clusters[0],
		configs:   configs,
		resources: resources,
		data:      contants.NewData(clusterName),
		work:      work,
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

func (f *FileSystem) mountRootfs(ipList []string, initFlag bool) error {
	r := v2.Rootfs(f.resources)
	if r == nil {
		return fmt.Errorf("get rootfs error,pelase mount MountResource after mountRootfs")
	}
	sh := contants.NewBash(f.cluster.Name, r.Status.Data)

	envProcessor := env.NewEnvProcessor(f.cluster)
	eg, _ := errgroup.WithContext(context.Background())

	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			src := r.Status.RawPath
			target := f.data.Homedir()
			sshClient := ssh.NewSSHByCluster(f.cluster, true)
			err := CopyFiles(sshClient, ip == f.cluster.GetMaster0IP(), ip, src, target)
			if err != nil {
				return fmt.Errorf("copy rootfs failed %v", err)
			}
			if initFlag {
				err = sshClient.CmdAsync(ip, envProcessor.WrapperShell(ip, sh.InitBash()))
				if err != nil {
					return fmt.Errorf("exec init.sh failed %v", err)
				}
			}
			return err
		})
	}
	return eg.Wait()
}
func (f *FileSystem) unmountRootfs(ipList []string) error {
	r := v2.Rootfs(f.resources)
	if r == nil {
		return fmt.Errorf("get rootfs error,pelase mount data to  filesystem")
	}
	sh := contants.NewBash(f.cluster.Name, r.Status.Data)
	clusterRootfsDir := f.data.KubePath()
	execClean := sh.CleanBash()
	rmRootfs := fmt.Sprintf("rm -rf %s", clusterRootfsDir)
	envProcessor := env.NewEnvProcessor(f.cluster)
	eg, _ := errgroup.WithContext(context.Background())
	for _, IP := range ipList {
		ip := IP
		eg.Go(func() error {
			SSH := ssh.NewSSHByCluster(f.cluster, true)
			cmd := fmt.Sprintf("%s && %s", execClean, rmRootfs)
			if err := SSH.CmdAsync(ip, envProcessor.WrapperShell(ip, cmd)); err != nil {
				return err
			}
			return nil
		})
	}
	return eg.Wait()
}
