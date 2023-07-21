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

	"github.com/labring/sealos/pkg/bootstrap"
	"github.com/labring/sealos/pkg/buildah"
	"github.com/labring/sealos/pkg/checker"
	"github.com/labring/sealos/pkg/clusterfile"
	"github.com/labring/sealos/pkg/config"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/filesystem/rootfs"
	"github.com/labring/sealos/pkg/guest"
	"github.com/labring/sealos/pkg/runtime"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type CreateProcessor struct {
	ClusterFile clusterfile.Interface
	Buildah     buildah.Interface
	Runtime     runtime.Interface
	Guest       guest.Interface
}

func (c *CreateProcessor) Execute(cluster *v2.Cluster) error {
	pipeLine, err := c.GetPipeLine()
	if err != nil {
		return err
	}
	for _, f := range pipeLine {
		if err = f(cluster); err != nil {
			return err
		}
	}

	return nil
}

func (c *CreateProcessor) GetPipeLine() ([]func(cluster *v2.Cluster) error, error) {
	var todoList []func(cluster *v2.Cluster) error
	todoList = append(todoList,
		// c.GetPhasePluginFunc(plugin.PhaseOriginally),
		c.Check,
		c.PreProcess,
		c.RunConfig,
		c.MountRootfs,
		c.MirrorRegistry,
		c.Bootstrap,
		// c.GetPhasePluginFunc(plugin.PhasePreInit),
		c.Init,
		c.Join,
		// c.GetPhasePluginFunc(plugin.PhasePreGuest),
		c.RunGuest,
		// c.GetPhasePluginFunc(plugin.PhasePostInstall),
	)

	return todoList, nil
}

func (c *CreateProcessor) Check(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline Check in CreateProcessor.")
	return NewCheckError(checker.RunCheckList([]checker.Interface{checker.NewHostChecker()}, cluster, checker.PhasePre))
}

func (c *CreateProcessor) PreProcess(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline PreProcess in CreateProcessor.")
	return NewPreProcessError(c.preProcess(cluster))
}

func (c *CreateProcessor) preProcess(cluster *v2.Cluster) error {
	if err := MountClusterImages(c.Buildah, cluster, false); err != nil {
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
	logger.Info("Executing pipeline RunConfig in CreateProcessor.")
	eg, _ := errgroup.WithContext(context.Background())
	for _, cManifest := range cluster.Status.Mounts {
		manifest := cManifest
		eg.Go(func() error {
			cfg := config.NewConfiguration(manifest.ImageName, manifest.MountPoint, c.ClusterFile.GetConfigs())
			return cfg.Dump()
		})
	}
	return eg.Wait()
}

func (c *CreateProcessor) MountRootfs(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline MountRootfs in CreateProcessor.")
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	fs, err := rootfs.NewRootfsMounter(cluster.Status.Mounts)
	if err != nil {
		return err
	}
	return fs.MountRootfs(cluster, hosts)
}

func (c *CreateProcessor) MirrorRegistry(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline MirrorRegistry in CreateProcessor.")
	return MirrorRegistry(cluster, cluster.Status.Mounts)
}

func (c *CreateProcessor) Bootstrap(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline Bootstrap in CreateProcessor")
	hosts := append(cluster.GetMasterIPAndPortList(), cluster.GetNodeIPAndPortList()...)
	bs := bootstrap.New(cluster)
	return bs.Apply(hosts...)
}

func (c *CreateProcessor) Init(_ *v2.Cluster) error {
	logger.Info("Executing pipeline Init in CreateProcessor.")
	// move init runtime here?
	return c.Runtime.Init()
}

func (c *CreateProcessor) Join(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline Join in CreateProcessor.")
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
	return yaml.MarshalYamlToFile(constants.Clusterfile(cluster.Name), cluster)
}

func (c *CreateProcessor) RunGuest(cluster *v2.Cluster) error {
	logger.Info("Executing pipeline RunGuest in CreateProcessor.")
	return c.Guest.Apply(cluster, cluster.Status.Mounts)
}

func NewCreateProcessor(name string, clusterFile clusterfile.Interface) (Interface, error) {
	bder, err := buildah.New(name)
	if err != nil {
		return nil, err
	}
	gs, err := guest.NewGuestManager()
	if err != nil {
		return nil, err
	}

	return &CreateProcessor{
		ClusterFile: clusterFile,
		Buildah:     bder,
		Guest:       gs,
	}, nil
}
