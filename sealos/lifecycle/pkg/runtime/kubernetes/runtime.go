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

package kubernetes

import (
	"errors"
	"fmt"
	"sync"

	"github.com/Masterminds/semver/v3"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/exec"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type KubeadmRuntime struct {
	config  *types.Config // from argument
	cluster *v2.Cluster

	token         *types.Token
	kubeadmConfig *types.KubeadmConfig // a deep copy from config.KubeadmConfig or a new one

	klogLevel    int
	cli          kubernetes.Client
	execer       ssh.Interface
	pathResolver constants.PathResolver
	remoteUtil   *ssh.Remote
	mu           sync.Mutex
}

func (k *KubeadmRuntime) Init() error {
	return k.runPipelines("init masters",
		k.InitKubeadmConfigToMaster0,
		k.InitCertsAndKubeConfigs,
		k.CopyStaticFilesToMasters,
		k.InitMaster0,
	)
}

func (k *KubeadmRuntime) GetRawConfig() ([]byte, error) {
	if k.config.KubeadmConfig == nil {
		return nil, errors.New("please provide a nonnull config")
	}
	in := *k.config.KubeadmConfig
	k.kubeadmConfig = &in

	if err := k.CompleteKubeadmConfig(); err != nil {
		return nil, err
	}
	cluster := k.cluster.DeepCopy()
	cluster.Status = v2.ClusterStatus{}

	conversion, err := k.kubeadmConfig.ToConvertedKubeadmConfig()
	if err != nil {
		return nil, err
	}
	objects := []interface{}{cluster,
		conversion.InitConfiguration,
		conversion.ClusterConfiguration,
		conversion.JoinConfiguration,
		conversion.KubeProxyConfiguration,
		conversion.KubeletConfiguration,
	}
	data, err := yaml.MarshalConfigs(objects...)
	if err != nil {
		return nil, err
	}
	return data, nil
}

func (k *KubeadmRuntime) Reset() error {
	logger.Info("start to delete Cluster: master %s, node %s", k.getMasterIPList(), k.getNodeIPList())
	return k.reset()
}

func (k *KubeadmRuntime) ScaleUp(newMasterIPList []string, newNodeIPList []string) error {
	if len(newMasterIPList) != 0 {
		logger.Info("%s will be added as master", newMasterIPList)
		if err := k.joinMasters(newMasterIPList); err != nil {
			return err
		}
	}
	if len(newNodeIPList) != 0 {
		logger.Info("%s will be added as worker", newNodeIPList)
		if err := k.joinNodes(newNodeIPList); err != nil {
			return err
		}
		return k.copyKubeConfigFileToNodes(newNodeIPList...)
	}
	return nil
}

func (k *KubeadmRuntime) ScaleDown(deleteMastersIPList []string, deleteNodesIPList []string) error {
	if len(deleteMastersIPList) != 0 {
		logger.Info("master %s will be deleted", deleteMastersIPList)
		if err := k.deleteMasters(deleteMastersIPList); err != nil {
			return err
		}
	}
	if len(deleteNodesIPList) != 0 {
		logger.Info("worker %s will be deleted", deleteNodesIPList)
		return k.deleteNodes(deleteNodesIPList)
	}
	return nil
}

func newKubeadmRuntime(cluster *v2.Cluster, kubeadm *types.KubeadmConfig) (*KubeadmRuntime, error) {
	sshClient := ssh.NewCacheClientFromCluster(cluster, true)
	execer, err := exec.New(sshClient)
	if err != nil {
		return nil, err
	}
	k := &KubeadmRuntime{
		cluster: cluster,
		config: &types.Config{
			KubeadmConfig:   kubeadm,
			APIServerDomain: constants.DefaultAPIServerDomain,
		},
		kubeadmConfig: types.NewKubeadmConfig(),
		execer:        execer,
		pathResolver:  constants.NewPathResolver(cluster.GetName()),
		remoteUtil:    ssh.NewRemoteFromSSH(cluster.GetName(), execer),
	}
	if err := k.Validate(); err != nil {
		return nil, err
	}
	if logger.IsDebugMode() {
		k.klogLevel = 6
	}
	return k, nil
}

func New(cluster *v2.Cluster, config any) (*KubeadmRuntime, error) {
	var kubeadm *types.KubeadmConfig
	if v, ok := config.(*types.KubeadmConfig); ok {
		kubeadm = v
	}
	return newKubeadmRuntime(cluster, kubeadm)
}

func (k *KubeadmRuntime) Validate() error {
	if len(k.cluster.Spec.Hosts) == 0 {
		return fmt.Errorf("master hosts cannot be empty")
	}
	if k.getMaster0IP() == "" {
		return fmt.Errorf("master hosts ip cannot be empty")
	}
	if k.getKubeVersionFromImage() == "" && k.cluster.DeletionTimestamp.IsZero() {
		return fmt.Errorf("cluster image kubernetes version cannot be empty")
	}
	return nil
}

func (k *KubeadmRuntime) Upgrade(version string) error {
	currVersion := k.getKubeVersionFromImage()

	v0, err := semver.NewVersion(currVersion)
	if err != nil {
		return err
	}
	v1, err := semver.NewVersion(version)
	if err != nil {
		return err
	}
	if v0.Equal(v1) {
		logger.Info("skip upgrade because of same version")
		return nil
	}

	if v0.GreaterThan(v1) {
		return fmt.Errorf("cannot apply an older version %s than %s", version, currVersion)
	}
	if v0.Minor()+1 < v1.Minor() {
		return fmt.Errorf("cannot be upgraded across more than one major releases, %s -> %s", currVersion, version)
	}

	return k.upgradeCluster(version)
}
