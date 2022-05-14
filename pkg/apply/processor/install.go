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

	"k8s.io/apimachinery/pkg/util/sets"

	"github.com/labring/sealos/pkg/utils/confirm"
	"github.com/labring/sealos/pkg/utils/logger"

	"github.com/labring/sealos/pkg/utils/rand"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/config"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/guest"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/image/types"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
)

var ForceOverride bool

type InstallProcessor struct {
	ClusterFile     clusterfile.Interface
	ImageManager    types.Service
	ClusterManager  types.ClusterService
	RegistryManager types.RegistryService
	Guest           guest.Interface
	NewMounts       []v2.MountImage
	NewImages       []string
}

func (c *InstallProcessor) ConfirmOverrideApps(cluster *v2.Cluster) error {
	if ForceOverride {
		prompt := "are you sure to override these app?"
		cancel := "you have canceled to override these apps !"
		pass, err := confirm.Confirm(prompt, cancel)
		if err != nil {
			return err
		}
		if !pass {
			return errors.New(cancel)
		}
	}
	return nil
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
		c.ConfirmOverrideApps,
		c.PreProcess,
		c.RunConfig,
		c.MountRootfs,
		//i.GetPhasePluginFunc(plugin.PhasePreGuest),
		c.RunGuest,
		c.PostProcess,
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
	if err = SyncClusterStatus(current, c.ClusterManager, c.ImageManager); err != nil {
		return err
	}
	err = c.RegistryManager.Pull(c.NewImages...)
	if err != nil {
		return err
	}
	ociList, err := c.ImageManager.Inspect(c.NewImages...)
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
	if imageTypes.Has(string(v2.AddonsImage)) && !imageTypes.Has(string(v2.RootfsImage)) {
		return errors.New("can't apply AddonsImage only, need to init a Cluster to append it")
	}
	for _, img := range c.NewImages {
		mount := cluster.FindImage(img)
		if mount == nil {
			//create
			mount = &v2.MountImage{
				Name:      fmt.Sprintf("%s-%s", cluster.Name, rand.Generator(8)),
				ImageName: img,
			}
			cluster.Spec.Image = append(cluster.Spec.Image, img)
		} else {
			if !ForceOverride {
				mount = nil
			}
		}
		if mount != nil {
			manifest, err := c.ClusterManager.Create(mount.Name, img)
			if err != nil {
				return err
			}
			mount.MountPoint = manifest.MountPoint
			if err = OCIToImageMount(mount, c.ImageManager); err != nil {
				return err
			}
			cluster.SetMountImage(mount)
			c.NewMounts = append(c.NewMounts, *mount)
		}
	}
	return nil
}
func (c *InstallProcessor) PostProcess(cluster *v2.Cluster) error {
	if len(c.NewMounts) == 0 {
		logger.Info("succeeded install app in this cluster: no change apps")
	} else {
		logger.Info("succeeded install app in this cluster")
	}
	return nil
}

func (c *InstallProcessor) RunConfig(cluster *v2.Cluster) error {
	if len(c.NewMounts) == 0 {
		return nil
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, cManifest := range c.NewMounts {
		manifest := cManifest
		eg.Go(func() error {
			cfg := config.NewConfiguration(manifest.MountPoint, c.ClusterFile.GetConfigs())
			return cfg.Dump()
		})
	}
	return eg.Wait()
}

func (c *InstallProcessor) MountRootfs(cluster *v2.Cluster) error {
	if len(c.NewMounts) == 0 {
		return nil
	}
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	fs, err := filesystem.NewRootfsMounter(c.NewMounts)
	if err != nil {
		return err
	}

	return fs.MountRootfs(cluster, hosts, false, true)
}

func (c *InstallProcessor) RunGuest(cluster *v2.Cluster) error {
	if len(c.NewMounts) == 0 {
		return nil
	}
	return c.Guest.Apply(cluster, c.NewMounts)
}

func NewInstallProcessor(clusterFile clusterfile.Interface, images []string) (Interface, error) {
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
		NewImages:       images,
	}, nil
}
