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
	"errors"
	"fmt"

	"github.com/labring/sealos/pkg/checker"
	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/utils/rand"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/config"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/guest"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type CreateProcessor struct {
	ClusterFile     clusterfile.Interface
	ImageManager    types.Service
	ClusterManager  types.ClusterService
	RegistryManager types.RegistryService
	Runtime         runtime.Interface
	Guest           guest.Interface
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
		c.Check,
		c.PreProcess,
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
func (c *CreateProcessor) Check(cluster *v2.Cluster) error {
	err := checker.RunCheckList([]checker.Interface{checker.NewHostChecker()}, cluster, checker.PhasePre)
	if err != nil {
		return err
	}
	ociList, err := c.ImageManager.Inspect(cluster.Spec.Image...)
	if err != nil {
		return err
	}
	imageTypes := sets.NewString()
	for _, oci := range ociList {
		if oci.Config.Labels != nil {
			imageTypes.Insert(oci.Config.Labels[contants.ImageTypeKey])
		} else {
			imageTypes.Insert(string(v2.AppImage))
		}
	}
	if !imageTypes.Has(string(v2.RootfsImage)) {
		return errors.New("can't apply ApplicationImage, kubernetes cluster not found, need to run a BaseImage")
	}
	return nil
}

func (c *CreateProcessor) PreProcess(cluster *v2.Cluster) error {
	err := c.RegistryManager.Pull(cluster.Spec.Image...)
	if err != nil {
		return err
	}
	for _, img := range cluster.Spec.Image {
		clusterManifest, err := c.ClusterManager.Create(fmt.Sprintf("%s-%s", cluster.Name, rand.Generator(8)), img)
		if err != nil {
			return err
		}
		mount := &v2.MountImage{
			Name:       clusterManifest.Container,
			ImageName:  img,
			MountPoint: clusterManifest.MountPoint,
		}
		if err = OCIToImageMount(mount, c.ImageManager); err != nil {
			return err
		}
		cluster.Status.Mounts = append(cluster.Status.Mounts, *mount)
	}
	if err = SyncClusterStatus(cluster, c.ClusterManager, c.ImageManager); err != nil {
		return err
	}
	runTime, err := runtime.NewDefaultRuntime(cluster, c.ClusterFile.GetKubeadmConfig())
	if err != nil {
		return fmt.Errorf("failed to init runtime, %v", err)
	}
	c.Runtime = runTime
	return nil
}

func (c *CreateProcessor) RunConfig(cluster *v2.Cluster) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, cManifest := range cluster.Status.Mounts {
		manifest := cManifest
		eg.Go(func() error {
			cfg := config.NewConfiguration(manifest.MountPoint, c.ClusterFile.GetConfigs())
			return cfg.Dump()
		})
	}
	return eg.Wait()
}

func (c *CreateProcessor) MountRootfs(cluster *v2.Cluster) error {
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	fs, err := filesystem.NewRootfsMounter(cluster.Status.Mounts)
	if err != nil {
		return err
	}
	return fs.MountRootfs(cluster, hosts, true, cluster.HasAppImage())
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
	return c.Guest.Apply(cluster, cluster.Status.Mounts)
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
