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

	"github.com/Masterminds/semver/v3"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/ssh"
	v2 "github.com/labring/sealos/pkg/types/v1beta1"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

type KubeadmRuntime struct {
	*sync.Mutex
	Cluster       *v2.Cluster
	ClusterClient ssh.Interface
	Token         *Token
	Registry      *v2.RegistryConfig
	*KubeadmConfig
	*Config
	cli kubernetes.Client
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
		k.UpdateCertByInit,
		k.CopyStaticFilesToMasters,
		k.InitMaster0,
	}

	return k.pipeline("init", pipeline)
}

func (k *KubeadmRuntime) GetConfig() ([]byte, error) {
	k.KubeadmConfig = k.ClusterFileKubeConfig
	if err := k.ConvertInitConfigConversion(); err != nil {
		return nil, err
	}
	k.Cluster.Status = v2.ClusterStatus{}
	objects := []interface{}{k.Cluster,
		k.InitConfiguration,
		k.ClusterConfiguration,
		k.JoinConfiguration,
		k.KubeProxyConfiguration,
		k.KubeletConfiguration,
	}
	data, err := yaml.MarshalYamlConfigs(objects...)
	if err != nil {
		return nil, err
	}
	return data, nil
}

type Interface interface {
	Init() error
	Reset() error
	ScaleUp(newMasterIPList []string, newNodeIPList []string) error
	ScaleDown(deleteMastersIPList []string, deleteNodesIPList []string) error
	SyncNodeIPVS(mastersIPList, nodeIPList []string) error
	Upgrade(version string) error
	GetConfig() ([]byte, error)

	UpdateCert(certs []string) error
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
		return k.copyNodeKubeConfig(newNodeIPList)
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

func newKubeadmRuntime(cluster *v2.Cluster, kubeadm *KubeadmConfig) (Interface, error) {
	sshClient := ssh.NewSSHByCluster(cluster, true)
	k := &KubeadmRuntime{
		Mutex:         &sync.Mutex{},
		Cluster:       cluster,
		ClusterClient: sshClient,
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
	return k, nil
}

// NewDefaultRuntime arg "clusterName" is the Cluster name
func NewDefaultRuntime(cluster *v2.Cluster, kubeadm *KubeadmConfig) (Interface, error) {
	return newKubeadmRuntime(cluster, kubeadm)
}

func NewDefaultRuntimeWithCurrentCluster(cluster *v2.Cluster, kubeadm *KubeadmConfig) (Interface, error) {
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
