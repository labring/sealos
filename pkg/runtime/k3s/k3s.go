// Copyright © 2023 sealos.
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

package k3s

import (
	"fmt"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type K3s struct {
	cluster *v2.Cluster
	config  *Config

	pathResolver constants.PathResolver
	sshClient    ssh.Interface
}

func New(cluster *v2.Cluster, config any) (*K3s, error) {
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	k := &K3s{
		cluster:      cluster,
		pathResolver: constants.NewPathResolver(cluster.GetName()),
		sshClient:    sshClient,
	}
	if v, ok := config.(*Config); ok {
		k.config = v
	}
	return k, nil
}

func (k *K3s) Init() error {
	return k.initMaster0()
}

func (k *K3s) Reset() error {
	if err := k.resetNodes(k.cluster.GetNodeIPAndPortList()); err != nil {
		logger.Error("resetting nodes: %v", err)
	}
	if err := k.resetNodes(k.cluster.GetMasterIPAndPortList()); err != nil {
		logger.Error("resetting masters: %v", err)
	}
	return nil
}

func (k *K3s) ScaleUp(masters []string, nodes []string) error {
	if err := k.joinMasters(masters); err != nil {
		return err
	}
	return k.joinNodes(nodes)
}

func (k *K3s) ScaleDown(masters []string, nodes []string) error {
	if err := k.resetNodes(nodes); err != nil {
		return err
	}
	return k.resetNodes(masters)
}

func (k *K3s) Upgrade(version string) error {
	logger.Info("trying to upgrade to version %s", version)
	return nil
}

func (k *K3s) GetRawConfig() ([]byte, error) {
	cfg, err := k.getInitConfig(k.overrideConfig, setClusterInit)
	if err != nil {
		return nil, err
	}
	cluster := k.cluster.DeepCopy()
	cluster.Status = v2.ClusterStatus{}
	return yaml.MarshalYamlConfigs(cluster, cfg)
}

func (k *K3s) SyncNodeIPVS(_, _ []string) error {
	logger.Error("not yet implemented, skip for testing")
	return nil
}

func (k *K3s) runPipelines(phase string, pipelines ...func() error) error {
	logger.Info("starting %s", phase)
	for i := range pipelines {
		if err := pipelines[i](); err != nil {
			return fmt.Errorf("failed to %s: %v", phase, err)
		}
	}
	return nil
}
