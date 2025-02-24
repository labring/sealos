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
	"context"
	"fmt"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/strings"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/env"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type K3s struct {
	cluster *v2.Cluster
	config  *Config

	envInterface env.Interface
	pathResolver constants.PathResolver
	remoteUtil   *ssh.Remote
	execer       exec.Interface
}

func New(cluster *v2.Cluster, config any) (*K3s, error) {
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return nil, err
	}
	k := &K3s{
		cluster:      cluster,
		pathResolver: constants.NewPathResolver(cluster.GetName()),
		execer:       execer,
		envInterface: env.NewEnvProcessor(cluster),
		remoteUtil:   ssh.NewRemoteFromSSH(cluster.GetName(), execer),
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
	if len(masters) != 0 {
		logger.Info("%s will be added as master", masters)
		if err := k.joinMasters(masters); err != nil {
			return err
		}
	}
	if len(nodes) != 0 {
		logger.Info("%s will be added as worker", nodes)
		if err := k.joinNodes(nodes); err != nil {
			return err
		}
	}
	return nil
}

func (k *K3s) ScaleDown(masters []string, nodes []string) error {
	if len(masters) != 0 {
		logger.Info("master %s will be deleted", masters)
		if err := k.removeNodes(masters); err != nil {
			return err
		}
	}
	if len(nodes) != 0 {
		logger.Info("worker %s will be deleted", nodes)
		return k.removeNodes(nodes)
	}
	return nil
}

func (k *K3s) Upgrade(version string) error {
	logger.Info("trying to upgrade to version %s", version)
	return nil
}

func (k *K3s) GetRawConfig() ([]byte, error) {
	defaultCallbacks := []callback{defaultingConfig, k.sealosCfg, k.overrideCertSans, k.overrideServerConfig, setClusterInit}
	cfg, err := k.getInitConfig(defaultCallbacks...)
	if err != nil {
		return nil, err
	}
	cluster := k.cluster.DeepCopy()
	cluster.Status = v2.ClusterStatus{}
	return yaml.MarshalConfigs(cluster, cfg)
}

func (k *K3s) SyncNodeIPVS(mastersIPList, nodeIPList []string) error {
	apiPort := k.getAPIServerPort()
	mastersIPList = strings.RemoveDuplicate(mastersIPList)
	masters := make([]string, 0)
	for _, master := range mastersIPList {
		masters = append(masters, fmt.Sprintf("%s:%d", iputils.GetHostIP(master), apiPort))
	}
	image := k.cluster.GetLvscareImage()
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodeIPList {
		node := node
		eg.Go(func() error {
			logger.Info("start to sync lvscare static pod to node: %s master: %+v", node, masters)
			err := k.remoteUtil.StaticPod(node, k.getVipAndPort(), constants.LvsCareStaticPodName, image, masters, k3sEtcStaticPod, "--health-status", "401")
			if err != nil {
				return fmt.Errorf("update lvscare static pod failed %s %v", node, err)
			}
			return nil
		})
	}
	return eg.Wait()
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
