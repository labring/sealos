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

	"golang.org/x/sync/errgroup"

	"github.com/fanux/sealos/pkg/clusterfile"
	"github.com/fanux/sealos/pkg/config"
	"github.com/fanux/sealos/pkg/filesystem"
	"github.com/fanux/sealos/pkg/guest"
	"github.com/fanux/sealos/pkg/image"
	"github.com/fanux/sealos/pkg/image/types"
	"github.com/fanux/sealos/pkg/runtime"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/yaml"
)

type CreateProcessor struct {
	ClusterFile     clusterfile.Interface
	ImageManager    types.Service
	ClusterManager  types.ClusterService
	RegistryManager types.RegistryService
	Runtime         runtime.Interface
	Guest           guest.Interface
	imageList       types.ImageListOCIV1
	cManifestList   types.ClusterManifestList
}

func (c *CreateProcessor) Execute(cluster *v2.Cluster) error {
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
func (c *CreateProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	todoList = append(todoList,
		//c.GetPhasePluginFunc(plugin.PhaseOriginally),
		c.CreateCluster,
		c.RunConfig,
		c.MountRootfs,
		//c.GetPhasePluginFunc(plugin.PhasePreInit),
		c.Init,
		c.Join,
		//c.GetPhasePluginFunc(plugin.PhasePreGuest),
		c.RunGuest,
		//c.GetPhasePluginFunc(plugin.PhasePostInstall),
	)
	return todoList, nil
}

func (c *CreateProcessor) CreateCluster(cluster *v2.Cluster) error {
	err := c.RegistryManager.Pull(cluster.Spec.Image...)
	if err != nil {
		return err
	}
	img, err := c.ImageManager.Inspect(cluster.Spec.Image...)
	if err != nil {
		return err
	}
	c.imageList = img
	runTime, err := runtime.NewDefaultRuntime(cluster, c.ClusterFile.GetKubeadmConfig(), c.imageList)
	if err != nil {
		return fmt.Errorf("failed to init runtime, %v", err)
	}
	c.Runtime = runTime
	c.cManifestList, err = c.ClusterManager.Create(cluster.Name, 0, cluster.Spec.Image...)
	return err
}

func (c *CreateProcessor) RunConfig(cluster *v2.Cluster) error {
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

func (c *CreateProcessor) MountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	fs, err := filesystem.NewRootfsMounter(c.cManifestList, c.imageList)
	if err != nil {
		return err
	}

	return fs.MountRootfs(cluster, hosts, true)
}

func (c *CreateProcessor) Init(cluster *v2.Cluster) error {
	return c.Runtime.Init()
}

func (c *CreateProcessor) Join(cluster *v2.Cluster) error {
	err := c.Runtime.JoinMasters(cluster.GetMasterIPAndPortList()[1:])
	if err != nil {
		return err
	}
	err = c.Runtime.JoinNodes(cluster.GetNodeIPAndPortList())
	if err != nil {
		return err
	}
	err = c.Runtime.SyncNodeIPVS(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList())
	if err != nil {
		return err
	}
	return yaml.MarshalYamlToFile(contants.Clusterfile(cluster.Name), cluster)
}

func (c *CreateProcessor) RunGuest(cluster *v2.Cluster) error {
	return c.Guest.Apply(cluster, nil)
}

func NewCreateProcessor(clusterFile clusterfile.Interface) (Interface, error) {
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

	return &CreateProcessor{
		ClusterFile:     clusterFile,
		ImageManager:    imgSvc,
		ClusterManager:  clusterSvc,
		RegistryManager: registrySvc,
		Guest:           gs,
	}, nil
}
