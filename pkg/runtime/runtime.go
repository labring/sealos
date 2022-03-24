/*
Copyright 2022 cuisongliu@qq.com.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package runtime

import (
	"sync"

	"github.com/fanux/sealos/pkg/image"

	"github.com/fanux/sealos/pkg/utils/contants"

	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/remote"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
)

type KubeadmRuntime struct {
	*sync.Mutex
	cluster      *v2.Cluster
	imageService image.Service
	registry     RegistryConfig
	*KubeadmConfig
	*config
	*client
}

//nolint
type config struct {
	// Clusterfile: the absolute path, we need to read kubeadm config from Clusterfile
	ClusterFileKubeConfig *KubeadmConfig
	apiServerDomain       string
	vlog                  int
}

//nolint
type client struct {
	sshInterface ssh.Interface
	envInterface env.Interface
	ctlInterface remote.Interface
	data         contants.Data
	bash         contants.Bash
}

type RegistryConfig struct {
	IP       string
	Domain   string
	Port     string
	Username string
	Password string
	Data     string
}

func (k *KubeadmRuntime) Init() error {
	pipeline := []func() error{
		k.BashInitOnMaster0,
		k.ConfigInitKubeadmToMaster0,
		k.UpdateCert,
		k.CopyStaticFilesToMasters,
		k.ApplyRegistry,
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
}

func (k *KubeadmRuntime) Reset() error {
	logger.Info("start to delete cluster: master %s, node %s", k.getMasterIPList(), k.getNodeIPList())
	if err := k.confirmDeleteNodes(); err != nil {
		return err
	}
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
		if err := k.confirmDeleteNodes(); err != nil {
			return err
		}
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
		if err := k.confirmDeleteNodes(); err != nil {
			return err
		}
	}
	return k.deleteMasters(mastersIPList)
}

func newKubeadmRuntime(clusterName string) (Interface, error) {
	k := &KubeadmRuntime{}
	imageService, err := image.NewImageService()
	if err != nil {
		return nil, err
	}
	k.imageService = imageService
	if err = k.setData(clusterName); err != nil {
		return nil, err
	}
	if err = k.setRegistry(); err != nil {
		return nil, err
	}
	if err = k.setClient(); err != nil {
		return nil, err
	}
	k.setCertSANS()
	return k, nil
}

// NewDefaultRuntime arg "clusterName" is the cluster name
func NewDefaultRuntime(clusterName string) (Interface, error) {
	return newKubeadmRuntime(clusterName)
}
