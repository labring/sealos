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
	"fmt"
	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/remote"
	"github.com/fanux/sealos/pkg/token"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"sync"
)

type KubeadmRuntime struct {
	*sync.Mutex
	vlog         int
	cluster      *v2.Cluster
	resources    *v2.Resource
	data         contants.Data
	work         contants.Worker
	bash         contants.Bash
	sshInterface ssh.Interface
	envInterface env.Interface
	registry     RegistryConfig
	token        *token.Token
	ctl          remote.Sealctl
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
}

func (k *KubeadmRuntime) Reset() error {
	logger.Info("Start to delete cluster: master %s, node %s", k.getMasterIPList(), k.getNodeIPList())
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

func newKubeadmRuntime(clusterName string) (Interface, error) {
	work := contants.NewWork(clusterName)
	clusterFile := work.Clusterfile()
	clusters, err := decode.Cluster(clusterFile)
	if err != nil {
		return nil, err
	}
	if len(clusters) != 1 {
		return nil, fmt.Errorf("cluster data length must is one")
	}
	resources, err := decode.Resource(clusterFile)
	if err != nil {
		return nil, err
	}
	r := v2.Rootfs(resources)

	k := &KubeadmRuntime{
		cluster:      &clusters[0],
		resources:    r,
		data:         contants.NewData(clusterName),
		work:         work,
		bash:         contants.NewBash(clusterName, r.Status.Data),
		sshInterface: ssh.NewSSHClient(&clusters[0].Spec.SSH, true),
		envInterface: env.NewEnvProcessor(&clusters[0]),
		registry:     getRegistry(&clusters[0]),
		ctl:          remote.NewSealctl(),
	}

	if logger.IsDebugModel() {
		k.vlog = 6
	}
	return k, nil
}

func getRegistry(cluster *v2.Cluster) RegistryConfig {
	data := v2.ConvertEnv(cluster.Spec.Env)
	registryData := data[v2.DefaultVarCRIRegistryData].(string)
	registryDomain := data[v2.DefaultVarCRIRegistryDomain].(string)
	registryPort := data[v2.DefaultVarCRIRegistryPort].(string)
	registryUsername := data[v2.DefaultVarCRIRegistryUsername].(string)
	registryPassword := data[v2.DefaultVarCRIRegistryPassword].(string)

	return RegistryConfig{
		IP:       cluster.GetMaster0IP(),
		Domain:   registryDomain,
		Port:     registryPort,
		Username: registryUsername,
		Password: registryPassword,
		Data:     registryData,
	}
}

// NewDefaultRuntime arg "clusterName" is the cluster name
func NewDefaultRuntime(clusterName string) (Interface, error) {
	return newKubeadmRuntime(clusterName)
}
