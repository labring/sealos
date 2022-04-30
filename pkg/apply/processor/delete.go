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
	"fmt"

	"github.com/larbing/sealos/pkg/utils/logger"

	"github.com/larbing/sealos/pkg/clusterfile"
	"github.com/larbing/sealos/pkg/filesystem"
	"github.com/larbing/sealos/pkg/image"
	"github.com/larbing/sealos/pkg/image/types"
	"github.com/larbing/sealos/pkg/runtime"
	v2 "github.com/larbing/sealos/pkg/types/v1beta1"
	"github.com/larbing/sealos/pkg/utils/contants"
	fileutil "github.com/larbing/sealos/pkg/utils/file"
)

type DeleteProcessor struct {
	ClusterManager types.ClusterService
	ImageManager   types.Service
	ClusterFile    clusterfile.Interface
	imgList        types.ImageListOCIV1
	cManifestList  types.ClusterManifestList
}

// Execute :according to the different of desired cluster to delete cluster.
func (d DeleteProcessor) Execute(cluster *v2.Cluster) (err error) {
	d.cManifestList, err = d.ClusterManager.Inspect(cluster.Name, 0, len(cluster.Spec.Image))
	if err != nil {
		logger.Warn("delete process failed to inspect cluster,make sure you install k8s cluster.")
		return err
	}
	d.imgList, err = d.ImageManager.Inspect(cluster.Spec.Image...)
	if err != nil {
		return fmt.Errorf("failed to inspect image, %v", err)
	}

	runTime, err := runtime.NewDefaultRuntime(cluster, d.ClusterFile.GetKubeadmConfig(), d.imgList)
	if err != nil {
		return fmt.Errorf("failed to delete runtime, %v", err)
	}

	err = runTime.Reset()
	if err != nil {
		return err
	}

	pipLine, err := d.GetPipeLine()
	if err != nil {
		return err
	}
	//TODO if error is exec net process ???
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
		d.UnMountRootfs,
		d.UnMountImage,
		d.CleanFS,
	)
	return todoList, nil
}

func (d DeleteProcessor) UnMountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	if d.cManifestList == nil {
		logger.Warn("delete process unmount rootfs skip is cluster not mount rootfs")
		return nil
	}
	fs, err := filesystem.NewRootfsMounter(d.cManifestList, d.imgList)
	if err != nil {
		return err
	}
	return fs.UnMountRootfs(cluster, hosts)
}

func (d DeleteProcessor) UnMountImage(cluster *v2.Cluster) error {
	return d.ClusterManager.Delete(cluster.Name, len(cluster.Spec.Image))
}

func (d DeleteProcessor) CleanFS(cluster *v2.Cluster) error {
	workDir := contants.ClusterDir(cluster.Name)
	dataDir := contants.NewData(cluster.Name).Homedir()
	return fileutil.CleanFiles(workDir, dataDir)
}

func NewDeleteProcessor(clusterFile clusterfile.Interface) (Interface, error) {
	imgSvc, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	clusterSvc, err := image.NewClusterService()
	if err != nil {
		return nil, err
	}

	return DeleteProcessor{
		ClusterFile:    clusterFile,
		ImageManager:   imgSvc,
		ClusterManager: clusterSvc,
	}, nil
}
