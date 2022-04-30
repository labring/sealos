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

	"golang.org/x/sync/errgroup"

	"github.com/larbing/sealos/pkg/clusterfile"
	"github.com/larbing/sealos/pkg/config"
	"github.com/larbing/sealos/pkg/filesystem"
	"github.com/larbing/sealos/pkg/guest"
	"github.com/larbing/sealos/pkg/image"
	"github.com/larbing/sealos/pkg/image/types"
	v2 "github.com/larbing/sealos/pkg/types/v1beta1"
	"github.com/larbing/sealos/pkg/utils/contants"
)

type InstallProcessor struct {
	ClusterFile     clusterfile.Interface
	ImageManager    types.Service
	ClusterManager  types.ClusterService
	RegistryManager types.RegistryService
	Guest           guest.Interface
	pullImages      []string
	imageList       types.ImageListOCIV1
	cManifestList   types.ClusterManifestList
}

func (c *InstallProcessor) Execute(cluster *v2.Cluster) error {
	pipLine, err := c.GetPipeLine()
	if err != nil {
		return err
	}

	for _, f := range pipLine {
		if err = f(cluster); err != nil {
			return err
		}
	}

	return nil
}
func (c *InstallProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	todoList = append(todoList,
		c.PreProcess,
		c.RunConfig,
		c.MountRootfs,
		//i.GetPhasePluginFunc(plugin.PhasePreGuest),
		c.RunGuest,
		//i.GetPhasePluginFunc(plugin.PhasePostInstall),
	)
	return todoList, nil
}

func (c *InstallProcessor) PreProcess(cluster *v2.Cluster) error {
	err := c.ClusterFile.Process()
	if err != nil {
		return err
	}
	current := c.ClusterFile.GetCluster()
	err = c.RegistryManager.Pull(c.pullImages...)
	if err != nil {
		return err
	}
	img, err := c.ImageManager.Inspect(c.pullImages...)
	if err != nil {
		return err
	}
	//TODO if app image is ok
	c.imageList = img
	c.cManifestList, err = c.ClusterManager.Create(cluster.Name, len(current.Spec.Image), c.pullImages...)
	return err
}

func (c *InstallProcessor) RunConfig(cluster *v2.Cluster) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, cManifest := range c.cManifestList {
		manifest := cManifest
		eg.Go(func() error {
			cfg := config.NewConfiguration(manifest.MountPoint, c.ClusterFile.GetConfigs())
			return cfg.Dump(contants.Clusterfile(cluster.Name))
		})
	}
	return eg.Wait()
}

func (c *InstallProcessor) MountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	fs, err := filesystem.NewRootfsMounter(c.cManifestList, c.imageList)
	if err != nil {
		return err
	}

	return fs.MountRootfs(cluster, hosts, false)
}

func (c *InstallProcessor) RunGuest(cluster *v2.Cluster) error {
	images := c.pullImages
	return c.Guest.Apply(cluster, images)
}

func NewInstallProcessor(clusterFile clusterfile.Interface, images v2.ImageList) (Interface, error) {
	imgSvc, err := image.NewImageService()
	if err != nil {
		return nil, err
	}

	clusterSvc, err := image.NewClusterService()
	if err != nil {
		return nil, err
	}

	registrySvc, err := image.NewRegistryService()
	if err != nil {
		return nil, err
	}

	gs, err := guest.NewGuestManager()
	if err != nil {
		return nil, err
	}

	return &InstallProcessor{
		ClusterFile:     clusterFile,
		ImageManager:    imgSvc,
		ClusterManager:  clusterSvc,
		RegistryManager: registrySvc,
		Guest:           gs,
		pullImages:      images,
	}, nil
}
