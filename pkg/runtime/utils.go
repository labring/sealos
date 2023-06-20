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
	"fmt"

	"github.com/labring/sealos/pkg/utils/maps"

	versionutil "k8s.io/apimachinery/pkg/util/version"

	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/api/errors"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/constants"
	_default "github.com/labring/sealos/pkg/runtime/defaults"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"
)

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
		logger.Info("set kubernetes v1.19.1 v1.19.2 kube Config")
	}
	return nil
}

func (k *KubeadmConfig) FetchDefaultKubeadmConfig() string {
	logger.Debug("using default kubeadm config")
	return _default.DefaultKubeadmConfig
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

func (k *KubeadmRuntime) sendKubeConfigFile(hosts []string, kubeFile string) error {
	absKubeFile := fmt.Sprintf("%s/%s", constants.KubernetesEtc, kubeFile)
	sealosKubeFile := fmt.Sprintf("%s/%s", k.getContentData().EtcPath(), kubeFile)
	return k.sendFileToHosts(hosts, sealosKubeFile, absKubeFile)
}

func (k *KubeadmRuntime) sendNewCertAndKey(hosts []string) error {
	logger.Info("start to copy etc pki files to masters")
	return k.sendFileToHosts(hosts, k.getContentData().PkiPath(), constants.KubernetesEtcPKI)
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

func (k *KubeadmRuntime) RemoveNodeFromK8sClient(ip string) error {
	logger.Info("start to remove node from k8s %s", ip)
	ctx := context.Background()
	hostname, err := k.getKubeExpansion().FetchHostNameFromInternalIP(ctx, ip)
	if err != nil {
		return fmt.Errorf("kubernetes client get hostname %s failed %v,skip delete node", ip, err)
	}
	deletePropagation := v1.DeletePropagationBackground
	err = k.getKubeInterface().Kubernetes().CoreV1().Nodes().Delete(ctx, hostname, v1.DeleteOptions{PropagationPolicy: &deletePropagation})
	if err != nil {
		if errors.IsNotFound(err) {
			return fmt.Errorf("not find target delete node ip: %s", ip)
		}
		return fmt.Errorf("kubernetes client delete node %s failed %v,skip delete node", ip, err)
	}
	return nil
}

var featureGatesUpdate = map[string][]string{
	"CSIStorageCapacity":  {"LessThan", "v1.21.0"},
	"TTLAfterFinished":    {"AtLeast", "v1.24.0"},
	"EphemeralContainers": {"AtLeast", "v1.26.0"},
}

func deleteFeatureMap[T string | bool](currentFeature map[string]T, versionStr string) map[string]T {
	for k, v := range featureGatesUpdate {
		if v[0] == "LessThan" &&
			versionutil.MustParseSemantic(versionStr).LessThan(versionutil.MustParseSemantic(v[1])) {
			delete(currentFeature, k)
		}
		if v[0] == "AtLeast" &&
			versionutil.MustParseSemantic(versionStr).AtLeast(versionutil.MustParseSemantic(v[1])) {
			delete(currentFeature, k)
		}
	}
	return currentFeature
}

func UpdateFeatureGatesConfiguration(featureGates any, version string) any {
	switch x := featureGates.(type) {
	case string:
		currentFeature := maps.StringToMap(x, ",")
		currentFeature = deleteFeatureMap(currentFeature, version)
		return maps.MapToStringBySpilt(currentFeature, ",")
	case map[string]bool:
		newFeature := x
		newFeature = deleteFeatureMap(newFeature, version)
		return newFeature
	}
	return nil
}
