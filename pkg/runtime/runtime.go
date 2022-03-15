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
	"context"
	"errors"
	"fmt"
	"github.com/fanux/sealos/pkg/cert"
	"github.com/fanux/sealos/pkg/cmd"
	"github.com/fanux/sealos/pkg/token"
	v2 "github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/confirm"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/decode"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"golang.org/x/sync/errgroup"
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
	registry     RegistryConfig
	token        *token.Token
	ctl          cmd.Sealctl
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
		k.ConfigInitKubeadmToMaster0,
		k.GenerateCert,
		k.CreateKubeConfig,
		k.CopyStaticFilesToMasters,
		k.ApplyRegistry,
		k.InitMaster0,
	}

	return k.pipeline("init", pipeline)
}

type Interface interface {
	Init() error
	Reset() error
}

func (k *KubeadmRuntime) Reset() error {
	logger.Info("Start to delete cluster: master %s, node %s", k.cluster.GetMasterIPList(), k.cluster.GetNodeIPList())
	if err := k.confirmDeleteNodes(); err != nil {
		return err
	}
	return k.reset()
}

var ForceDelete bool

func (k *KubeadmRuntime) confirmDeleteNodes() error {
	if !ForceDelete {
		prompt := "Are you sure to delete these nodes?"
		cancel := "You have canceled to delete these nodes !"
		if pass, err := confirm.Confirm(prompt, cancel); err != nil {
			return err
		} else if !pass {
			return errors.New(cancel)
		}
	}
	return nil
}

func (k *KubeadmRuntime) pipeline(name string, pipeline []func() error) error {
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to %s %v", name, err)
		}
	}
	return nil
}

func (k *KubeadmRuntime) SendJoinMasterKubeConfigs(masters []string, files ...string) error {
	for _, f := range files {
		if err := k.sendKubeConfigFile(masters, f); err != nil {
			return err
		}
	}
	if k.ReplaceKubeConfigV1991V1992(masters) {
		logger.Info("set kubernetes v1.19.1 v1.19.2 kube config")
	}
	return nil
}

func (k *KubeadmRuntime) getKubeVersion() string {
	return k.resources.Status.Version
}
func (k *KubeadmRuntime) ReplaceKubeConfigV1991V1992(masters []string) bool {
	version := k.getKubeVersion()
	const V1991 = "v1.19.1"
	const V1992 = "v1.19.2"
	const RemoteReplaceKubeConfig = `grep -qF "apiserver.cluster.local" %s  && sed -i 's/apiserver.cluster.local/%s/' %s && sed -i 's/apiserver.cluster.local/%s/' %s`
	// fix > 1.19.1 kube-controller-manager and kube-scheduler use the LocalAPIEndpoint instead of the ControlPlaneEndpoint.
	if version == V1991 || version == V1992 {
		for _, v := range masters {
			replaceCmd := fmt.Sprintf(RemoteReplaceKubeConfig, KUBESCHEDULERCONFIGFILE, v, KUBECONTROLLERCONFIGFILE, v, KUBESCHEDULERCONFIGFILE)
			if err := k.sshInterface.CmdAsync(v, replaceCmd); err != nil {
				logger.Info("failed to replace kube config on %s:%v ", v, err)
				return false
			}
		}
		return true
	}
	return false
}

func (k *KubeadmRuntime) sendKubeConfigFile(hosts []string, kubeFile string) error {
	absKubeFile := fmt.Sprintf("%s/%s", cert.KubernetesDir, kubeFile)
	sealerKubeFile := fmt.Sprintf("%s/%s", k.data.EtcPath(), kubeFile)
	return k.sendFileToHosts(hosts, sealerKubeFile, absKubeFile)
}

func (k *KubeadmRuntime) sendNewCertAndKey(hosts []string) error {
	return k.sendFileToHosts(hosts, k.data.PkiPath(), cert.KubeDefaultCertPath)
}

func (k *KubeadmRuntime) sendFileToHosts(Hosts []string, src, dst string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range Hosts {
		node := node
		eg.Go(func() error {
			if err := k.sshInterface.Copy(node, src, dst); err != nil {
				return fmt.Errorf("send file failed %v", err)
			}
			return nil
		})
	}
	return eg.Wait()
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
		registry:     getRegistry(&clusters[0]),
		ctl:          cmd.NewSealctl(),
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
