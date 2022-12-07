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

package runtime

import (
	"fmt"
	"sync"

	"github.com/labring/sealos/pkg/utils/logger"

	v2 "github.com/labring/sealos/pkg/types/v1beta1"
)

type KubeadmRuntime struct {
	*sync.Mutex
	Cluster      *v2.Cluster
	Token        *Token
	registryOnce sync.Once
	Registry     *v2.RegistryConfig
	*KubeadmConfig
	*Config
}

//nolint:all
type Config struct {
	// Clusterfile: the absolute path, we need to read kubeadm Config from Clusterfile
	ClusterFileKubeConfig *KubeadmConfig
	APIServerDomain       string
	vlog                  int
}

func (k *KubeadmRuntime) Init() error {
	pipeline := []func() error{
		k.ConfigInitKubeadmToMaster0,
		k.UpdateCert,
		k.CopyStaticFilesToMasters,
		k.InitMaster0,
	}

	return k.pipeline("init", pipeline)
}

type Interface interface {
	Init() error
	Reset() error
	JoinNodes(newNodesIPList []string) error
	DeleteNodes(nodeIPList []string) error
	JoinMasters(newMastersIPList []string) error
	DeleteMasters(mastersIPList []string) error
	SyncNodeIPVS(mastersIPList, nodeIPList []string) error
}

func (k *KubeadmRuntime) Reset() error {
	logger.Info("start to delete Cluster: master %s, node %s", k.getMasterIPList(), k.getNodeIPList())
	return k.reset()
}

func (k *KubeadmRuntime) JoinNodes(newNodesIPList []string) error {
	if len(newNodesIPList) != 0 {
		logger.Info("%s will be added as worker", newNodesIPList)
	}
	if err := k.joinNodes(newNodesIPList); err != nil {
		return err
	}
	return k.copyNodeKubeConfig(newNodesIPList)
}
func (k *KubeadmRuntime) DeleteNodes(nodesIPList []string) error {
	if len(nodesIPList) != 0 {
		logger.Info("worker %s will be deleted", nodesIPList)
	}
	return k.deleteNodes(nodesIPList)
}

func (k *KubeadmRuntime) JoinMasters(newMastersIPList []string) error {
	if len(newMastersIPList) != 0 {
		logger.Info("%s will be added as master", newMastersIPList)
	}
	return k.joinMasters(newMastersIPList)
}

func (k *KubeadmRuntime) DeleteMasters(mastersIPList []string) error {
	if len(mastersIPList) != 0 {
		logger.Info("master %s will be deleted", mastersIPList)
	}
	return k.deleteMasters(mastersIPList)
}

func newKubeadmRuntime(cluster *v2.Cluster, kubeadm *KubeadmConfig) (Interface, error) {
	k := &KubeadmRuntime{
		Cluster: cluster,
		Config: &Config{
			ClusterFileKubeConfig: kubeadm,
			APIServerDomain:       DefaultAPIServerDomain,
		},
		KubeadmConfig: &KubeadmConfig{},
	}
	if err := k.Validate(); err != nil {
		return nil, err
	}
	if logger.IsDebugMode() {
		k.vlog = 6
	}
	k.setCertSANS()
	return k, nil
}

// NewDefaultRuntime arg "clusterName" is the Cluster name
func NewDefaultRuntime(cluster *v2.Cluster, kubeadm *KubeadmConfig) (Interface, error) {
	return newKubeadmRuntime(cluster, kubeadm)
}

func (k *KubeadmRuntime) Validate() error {
	if len(k.Cluster.Spec.Hosts) == 0 {
		return fmt.Errorf("master hosts cannot be empty")
	}
	if k.getMaster0IP() == "" {
		return fmt.Errorf("master hosts ip cannot be empty")
	}
	if k.getKubeVersionFromImage() == "" && k.Cluster.DeletionTimestamp.IsZero() {
		return fmt.Errorf("cluster image kubernetes version cannot be empty")
	}
	return nil
}
