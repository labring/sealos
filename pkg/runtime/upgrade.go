// Copyright © 2022 sealos.
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
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	upgradeApplyCmd = "kubeadm upgrade apply --yes %s"
	upradeNodeCmd   = "kubeadm upgrade node"
	//drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
	cordonNodeCmd   = "kubectl cordon %s"
	uncordonNodeCmd = "kubectl uncordon %s"
	daemonReload    = "systemctl daemon-reload"
	restartKubelet  = "systemctl restart kubelet"

	installKubeadmCmd = "cp -rf %s/kubeadm /usr/bin"
	installKubeletCmd = "cp -rf %s/kubelet /usr/bin"
	installKubectlCmd = "cp -rf %s/kubectl /usr/bin"
)

func (k *KubeadmRuntime) upgradeCluster(version string) error {
	logger.Info("Change ClusterConfiguration up to newVersion if need.")
	if err := k.autoUpdateConfig(version); err != nil {
		return err
	}
	//upgrade master0
	logger.Info("start to upgrade master0")
	err := k.upgradeMaster0(version)
	if err != nil {
		return err
	}
	//upgrade other control-planes and worker nodes
	var upgradeNodes []string
	for _, node := range append(k.getMasterIPAndPortList(), k.getNodeIPAndPortList()...) {
		if node == k.getMaster0IPAndPort() {
			continue
		}
		upgradeNodes = append(upgradeNodes, node)
	}
	logger.Info("start to upgrade other control-planes and worker nodes")
	return k.upgradeOtherNodes(upgradeNodes, version)
}

func (k *KubeadmRuntime) upgradeMaster0(version string) error {
	master0ip := k.getMaster0IP()
	sver := semver.MustParse(version)
	if gte(sver, V1260) {
		if err := k.changeCRIVersion(master0ip); err != nil {
			return err
		}
	}
	master0Name, err := k.getRemoteInterface().Hostname(master0ip)
	if err != nil {
		return err
	}
	//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
	master0Name = strings.ToLower(master0Name)
	kubeBinaryPath := k.getContentData().RootFSBinPath()
	//assure the connection to api-server succeed before executing upgrade cmds
	if err = k.pingAPIServer(); err != nil {
		return err
	}
	err = k.sshCmdAsync(master0ip,
		//install kubeadm:{version} at master0
		fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
		//execute  kubeadm upgrade apply {version} at master0
		fmt.Sprintf(upgradeApplyCmd, version),
		//kubectl cordon <node-to-cordon>
		fmt.Sprintf(cordonNodeCmd, master0Name),
		//install kubelet:{version},kubectl{version} at master0
		fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
		fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
		//reload kubelet daemon
		daemonReload,
		restartKubelet,
	)
	if err != nil {
		return err
	}
	return k.tryUncordonNode(master0ip, master0Name)
}

func (k *KubeadmRuntime) upgradeOtherNodes(ips []string, version string) error {
	sver := semver.MustParse(version)
	for _, ip := range ips {
		if gte(sver, V1260) {
			if err := k.changeCRIVersion(ip); err != nil {
				return err
			}
		}
		nodename, err := k.getRemoteInterface().Hostname(ip)
		if err != nil {
			return err
		}
		//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
		nodename = strings.ToLower(nodename)
		kubeBinaryPath := k.getContentData().RootFSBinPath()
		//assure the connection to api-server succeed before executing upgrade cmds
		if err = k.pingAPIServer(); err != nil {
			return err
		}
		logger.Info("upgrade node %s", nodename)
		err = k.sshCmdAsync(ip,
			//install kubeadm:{version} at the node
			fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
			//upgrade other control-plane and nodes
			upradeNodeCmd,
			//kubectl cordon <node-to-cordon>
			fmt.Sprintf(cordonNodeCmd, nodename),
			//install kubelet:{version},kubectl{version} at the node
			fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
			fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
			//reload kubelet daemon
			daemonReload,
			restartKubelet,
		)
		if err != nil {
			return err
		}
		if err = k.tryUncordonNode(ip, nodename); err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeadmRuntime) autoUpdateConfig(version string) error {
	ctx := context.Background()
	clusterCfg, err := k.getKubeExpansion().FetchKubeadmConfig(ctx)
	if err != nil {
		return err
	}
	kubeletCfg, err := k.getKubeExpansion().FetchKubeletConfig(ctx)
	if err != nil {
		return err
	}
	logger.Debug("get cluster configmap data:\n%s", clusterCfg)
	logger.Debug("get kubelet configmap data:\n%s", kubeletCfg)
	allConfig := strings.Join([]string{clusterCfg, kubeletCfg}, "\n---\n")
	defaultKubeadmConfig, err := LoadKubeadmConfigs(allConfig, false, DecodeCRDFromString)
	if err != nil {
		logger.Error("failed to decode cluster kubeadm config: %s", err)
		return err
	}
	defaultKubeadmConfig.InitConfiguration = kubeadm.InitConfiguration{
		TypeMeta: metaV1.TypeMeta{
			APIVersion: defaultKubeadmConfig.ClusterConfiguration.APIVersion,
		},
	}

	kk := &KubeadmRuntime{
		KubeadmConfig: defaultKubeadmConfig,
	}
	kk.setKubeVersion(version)
	kk.setFeatureGatesConfiguration()
	if err = kk.convertKubeadmVersion(); err != nil {
		return err
	}

	newClusterData, err := yaml.MarshalYamlConfigs(&kk.conversion.ClusterConfiguration)
	if err != nil {
		logger.Error("failed to encode ClusterConfiguration: %s", err)
		return err
	}
	logger.Debug("update cluster config:\n%s", string(newClusterData))
	err = k.getKubeExpansion().UpdateKubeadmConfig(ctx, string(newClusterData))
	if err != nil {
		logger.Error("failed to update kubeadm-config with k8s-client: %s", err)
		return err
	}

	newKubeletData, err := yaml.MarshalYamlConfigs(&kk.conversion.KubeletConfiguration)
	if err != nil {
		logger.Error("failed to encode KubeletConfiguration: %s", err)
		return err
	}
	logger.Debug("update kubelet config:\n%s", string(newKubeletData))
	err = k.getKubeExpansion().UpdateKubeletConfig(ctx, string(newKubeletData))
	if err != nil {
		logger.Error("failed to update kubelet-config with k8s-client: %s", err)
		return err
	}

	return nil
}

func (k *KubeadmRuntime) pingAPIServer() error {
	timeout := time.Now().Add(1 * time.Minute)
	for {
		_, err := k.getKubeInterface().Kubernetes().CoreV1().Nodes().List(context.TODO(), metaV1.ListOptions{})
		if err == nil {
			break
		}
		if time.Now().After(timeout) {
			return fmt.Errorf("restart api-server timeout within one minute")
		}
		time.Sleep(5 * time.Second)
	}
	return nil
}

func (k *KubeadmRuntime) tryUncordonNode(ip, nodename string) error {
	err := k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
	timeout := time.Now().Add(1 * time.Minute)
	for err != nil {
		time.Sleep(5 * time.Second)
		err = k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
		if err == nil {
			break
		}
		if time.Now().After(timeout) {
			return fmt.Errorf("try uncordon node %s timeout one minute", nodename)
		}
	}
	return nil
}

func (k *KubeadmRuntime) changeCRIVersion(ip string) error {
	return k.sshCmdAsync(ip,
		"sed -i \"s/v1alpha2/v1/\" /etc/image-cri-shim.yaml",
		"systemctl restart image-cri-shim",
		"systemctl restart kubelet",
	)
}
