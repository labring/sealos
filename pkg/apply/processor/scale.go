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

	"github.com/labring/sealos/pkg/checker"

	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/config"
	"github.com/labring/sealos/pkg/filesystem"
	"github.com/labring/sealos/pkg/image"
	"github.com/labring/sealos/pkg/image/types"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/contants"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
	"golang.org/x/sync/errgroup"
)

type ScaleProcessor struct {
	ClusterFile     clusterfile.Interface
	Runtime         runtime.Interface
	ImageManager    types.Service
	ClusterManager  types.ClusterService
	pullImages      []string
	MastersToJoin   []string
	MastersToDelete []string
	NodesToJoin     []string
	NodesToDelete   []string
	IsScaleUp       bool
}

func (c *ScaleProcessor) Execute(cluster *v2.Cluster) error {
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
func (c *ScaleProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	if c.IsScaleUp {
		todoList = append(todoList,
			c.JoinCheck,
			c.PreProcess,
			c.RunConfig,
			c.MountRootfs,
			//s.GetPhasePluginFunc(plugin.PhasePreJoin),
			c.Join,
			//s.GetPhasePluginFunc(plugin.PhasePostJoin),
		)
		return todoList, nil
	}

	todoList = append(todoList,
		c.DeleteCheck,
		c.PreProcess,
		c.Delete,
		//c.ApplyCleanPlugin,
		c.UnMountRootfs,
	)
	return todoList, nil
}
func (c *ScaleProcessor) Delete(cluster *v2.Cluster) error {
	err := c.Runtime.DeleteMasters(c.MastersToDelete)
	if err != nil {
		return err
	}
	return c.Runtime.DeleteNodes(c.NodesToDelete)
}
func (c *ScaleProcessor) Join(cluster *v2.Cluster) error {
	err := c.Runtime.JoinMasters(c.MastersToJoin)
	if err != nil {
		return err
	}
	err = c.Runtime.JoinNodes(c.NodesToJoin)
	if err != nil {
		return err
	}
	return c.Runtime.SyncNodeIPVS(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList())
}

func (c ScaleProcessor) UnMountRootfs(cluster *v2.Cluster) error {
	hosts := append(c.MastersToDelete, c.NodesToDelete...)
	if cluster.Status.Mounts == nil {
		logger.Warn("delete process unmount rootfs skip is cluster not mount rootfs")
		return nil
	}
	fs, err := filesystem.NewRootfsMounter(cluster.Status.Mounts)
	if err != nil {
		return err
	}
	return fs.UnMountRootfs(cluster, hosts)
}

func (c *ScaleProcessor) JoinCheck(cluster *v2.Cluster) error {
	var ips []string
	ips = append(ips, cluster.GetMaster0IPAndPort())
	ips = append(ips, c.MastersToJoin...)
	ips = append(ips, c.NodesToJoin...)
	err := checker.RunCheckList([]checker.Interface{checker.NewIPsHostChecker(ips)}, cluster, checker.PhasePre)
	if err != nil {
		return err
	}
	return nil
}

func (c *ScaleProcessor) DeleteCheck(cluster *v2.Cluster) error {
	var ips []string
	ips = append(ips, cluster.GetMaster0IPAndPort())
	ips = append(ips, c.MastersToDelete...)
	ips = append(ips, c.NodesToDelete...)
	err := checker.RunCheckList([]checker.Interface{checker.NewIPsHostChecker(ips)}, cluster, checker.PhasePre)
	if err != nil {
		return err
	}
	return nil
}

func (c *ScaleProcessor) PreProcess(cluster *v2.Cluster) error {
	err := c.ClusterFile.Process()
	if err != nil {
		return err
	}
	if err = SyncClusterStatus(cluster, c.ClusterManager, c.ImageManager); err != nil {
		return err
	}
	if c.IsScaleUp {
		clusterPath := contants.Clusterfile(cluster.Name)
		if err = yaml.MarshalYamlToFile(clusterPath, cluster); err != nil {
			return err
		}
	}
	runTime, err := runtime.NewDefaultRuntime(cluster, c.ClusterFile.GetKubeadmConfig())
	if err != nil {
		return fmt.Errorf("failed to init runtime, %v", err)
	}
	c.Runtime = runTime

	return err
}

func (c *ScaleProcessor) RunConfig(cluster *v2.Cluster) error {
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

func (c *ScaleProcessor) MountRootfs(cluster *v2.Cluster) error {
	hosts := append(c.MastersToJoin, c.NodesToJoin...)
	fs, err := filesystem.NewRootfsMounter(cluster.Status.Mounts)
	if err != nil {
		return err
	}

	return fs.MountRootfs(cluster, hosts, true, false)
}

func NewScaleProcessor(clusterFile clusterfile.Interface, images v2.ImageList, masterToJoin, masterToDelete, nodeToJoin, nodeToDelete []string) (Interface, error) {
	imgSvc, err := image.NewImageService()
	if err != nil {
		return nil, err
	}

	clusterSvc, err := image.NewClusterService()
	if err != nil {
		return nil, err
	}

	var up bool
	// only scale up or scale down at a time
	if len(masterToJoin) > 0 || len(nodeToJoin) > 0 {
		up = true
	}

	return &ScaleProcessor{
		MastersToDelete: masterToDelete,
		MastersToJoin:   masterToJoin,
		NodesToDelete:   nodeToDelete,
		NodesToJoin:     nodeToJoin,
		ClusterFile:     clusterFile,
		ImageManager:    imgSvc,
		ClusterManager:  clusterSvc,
		pullImages:      images,
		IsScaleUp:       up,
	}, nil
}
