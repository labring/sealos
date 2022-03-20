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
	e "errors"
	"fmt"

	"github.com/fanux/sealos/pkg/client-go/kubernetes"
	"github.com/fanux/sealos/pkg/utils/confirm"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
	v12 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

var ForceDelete bool

const (
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"
)

func (k *KubeadmRuntime) confirmDeleteNodes() error {
	if !ForceDelete {
		prompt := "Are you sure to delete these nodes?"
		cancel := "You have canceled to delete these nodes !"
		if pass, err := confirm.Confirm(prompt, cancel); err != nil {
			return err
		} else if !pass {
			return e.New(cancel)
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
	logger.Info("start to copy kubeconfig files to masters")
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

func (k *KubeadmRuntime) ReplaceKubeConfigV1991V1992(masters []string) bool {
	version := k.getKubeVersion()
	const V1991 = "v1.19.1"
	const V1992 = "v1.19.2"
	const RemoteReplaceKubeConfig = `grep -qF "apiserver.cluster.local" %s  && sed -i 's/apiserver.cluster.local/%s/' %s && sed -i 's/apiserver.cluster.local/%s/' %s`
	// fix > 1.19.1 kube-controller-manager and kube-scheduler use the LocalAPIEndpoint instead of the ControlPlaneEndpoint.
	if version == V1991 || version == V1992 {
		for _, v := range masters {
			replaceCmd := fmt.Sprintf(RemoteReplaceKubeConfig, KUBESCHEDULERCONFIGFILE, v, KUBECONTROLLERCONFIGFILE, v, KUBESCHEDULERCONFIGFILE)
			if err := k.sshCmdAsync(v, replaceCmd); err != nil {
				logger.Info("failed to replace kube config on %s:%v ", v, err)
				return false
			}
		}
		return true
	}
	return false
}

func (k *KubeadmRuntime) sendKubeConfigFile(hosts []string, kubeFile string) error {
	absKubeFile := fmt.Sprintf("%s/%s", contants.KubernetesEtc, kubeFile)
	sealerKubeFile := fmt.Sprintf("%s/%s", k.data.EtcPath(), kubeFile)
	return k.sendFileToHosts(hosts, sealerKubeFile, absKubeFile)
}

func (k *KubeadmRuntime) sendNewCertAndKey(hosts []string) error {
	logger.Info("start to copy etc pki files to masters")
	return k.sendFileToHosts(hosts, k.data.PkiPath(), contants.KubernetesEtcPKI)
}

func (k *KubeadmRuntime) sendFileToHosts(Hosts []string, src, dst string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range Hosts {
		node := node
		eg.Go(func() error {
			if err := k.sshCopy(node, src, dst); err != nil {
				return fmt.Errorf("send file failed %v", err)
			}
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) deleteKubeNode(ip string) error {
	logger.Info("start to remove node from k8s %s", ip)
	cli, err := kubernetes.NewKubernetesClient(k.data.AdminFile(), k.getMaster0IPAPIServer())
	if err != nil {
		return err
	}
	ctx := context.Background()
	nodeList, err := cli.Kubernetes().CoreV1().Nodes().List(ctx, v1.ListOptions{})
	if err != nil {
		return err
	}
	var nodeType *v12.Node
	for _, n := range nodeList.Items {
		for _, addr := range n.Status.Addresses {
			if addr.Type == v12.NodeInternalIP && addr.Address == ip {
				nodeType = &n
			}
		}
	}
	if nodeType == nil {
		logger.Warn("not find target delete node ip: %s", ip)
		return nil
	}
	deletePropagation := v1.DeletePropagationBackground
	err = cli.Kubernetes().CoreV1().Nodes().Delete(ctx, nodeType.Name, v1.DeleteOptions{PropagationPolicy: &deletePropagation})
	if err != nil {
		if errors.IsNotFound(err) {
			logger.Warn("not find target delete node ip: %s", ip)
		}
		return err
	}
	return nil
}
