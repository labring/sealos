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

package kubernetes

import (
	"context"
	"fmt"
	"path"

	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"
)

func (k *KubeadmRuntime) runPipelines(phase string, pipelines ...func() error) error {
	for i := range pipelines {
		if err := pipelines[i](); err != nil {
			return fmt.Errorf("failed to %s: %v", phase, err)
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
		logger.Info("set kubernetes v1.19.1 v1.19.2 kube Config")
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
				logger.Info("failed to replace kube Config on %s:%v ", v, err)
				return false
			}
		}
		return true
	}
	return false
}

func (k *KubeadmRuntime) sendKubeConfigFile(hosts []string, filename string) error {
	dst := path.Join(kubernetesEtc, filename)
	src := path.Join(k.pathResolver.EtcPath(), filename)
	return k.sendFileToHosts(hosts, src, dst)
}

func (k *KubeadmRuntime) sendNewCertAndKey(hosts []string) error {
	logger.Info("start to copy etc pki files to masters")
	return k.sendFileToHosts(hosts, k.pathResolver.PkiPath(), kubernetesEtcPKI)
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

func (k *KubeadmRuntime) removeNode(ip string) error {
	logger.Info("start to remove node from k8s %s", ip)
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	ctx := context.Background()
	exp := kubernetes.NewKubeExpansion(client.Kubernetes())
	hostname, err := exp.FetchHostNameFromInternalIP(ctx, ip)
	if err != nil {
		return fmt.Errorf("cannot get node with ip address %s: %v", ip, err)
	}
	deletePropagation := v1.DeletePropagationBackground
	err = client.Kubernetes().CoreV1().Nodes().Delete(ctx, hostname, v1.DeleteOptions{PropagationPolicy: &deletePropagation})
	if err != nil && !errors.IsNotFound(err) {
		return err
	}
	return nil
}

func (k *KubeadmRuntime) setFeatureGatesConfiguration() {
	k.kubeadmConfig.FinalizeFeatureGatesConfiguration()
}
