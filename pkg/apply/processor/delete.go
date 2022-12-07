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
	"fmt"

	"github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/constants"
	fileutil "github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

var ForceDelete bool

type DeleteProcessor struct {
	Buildah     buildah.Interface
	ClusterFile clusterfile.Interface
}

// Execute :according to the different of desired cluster to delete cluster.
func (d DeleteProcessor) Execute(cluster *v2.Cluster) (err error) {
	pipLine, err := d.GetPipeLine()
	if err != nil {
		return err
	}
	// TODO if error is exec net process ???
	for _, f := range pipLine {
		if err = f(cluster); err != nil {
			logger.Warn("failed to exec delete process, %s", err.Error())
		}
	}

	return nil
}
func (d DeleteProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	todoList = append(todoList,
		d.PreProcess,
		d.Reset,
		d.UnMountRootfs,
		d.UnMountImage,
		d.CleanFS,
	)
	return todoList, nil
}

func (d *DeleteProcessor) PreProcess(cluster *v2.Cluster) error {
	return SyncClusterStatus(cluster, d.Buildah, true)
}

func (d *DeleteProcessor) Reset(cluster *v2.Cluster) error {
	runTime, err := runtime.NewDefaultRuntime(cluster, d.ClusterFile.GetKubeadmConfig())
	if err != nil {
		return fmt.Errorf("failed to delete runtime, %v", err)
	}
	return runTime.Reset()
}

func (d DeleteProcessor) UnMountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	if strings.NotInIPList(cluster.GetRegistryIPAndPort(), hosts) {
		hosts = append(hosts, cluster.GetRegistryIPAndPort())
	}
	if cluster.Status.Mounts == nil {
		logger.Warn("delete process unmount rootfs skip is cluster not mount any rootfs")
		return nil
	}
	fs, err := filesystem.NewRootfsMounter(cluster.Status.Mounts)
	if err != nil {
		return err
	}
	return fs.UnMountRootfs(cluster, hosts)
}

func (d DeleteProcessor) UnMountImage(cluster *v2.Cluster) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, mount := range cluster.Status.Mounts {
		mount := mount
		eg.Go(func() error {
			return d.Buildah.Delete(mount.Name)
		})
	}
	return eg.Wait()
}

func (d DeleteProcessor) CleanFS(cluster *v2.Cluster) error {
	workDir := constants.ClusterDir(cluster.Name)
	dataDir := constants.NewData(cluster.Name).Homedir()
	return fileutil.CleanFiles(workDir, dataDir)
}

func NewDeleteProcessor(name string, clusterFile clusterfile.Interface) (Interface, error) {
	bder, err := buildah.New(name)
	if err != nil {
		return nil, err
	}

	return DeleteProcessor{
		Buildah:     bder,
		ClusterFile: clusterFile,
	}, nil
}
