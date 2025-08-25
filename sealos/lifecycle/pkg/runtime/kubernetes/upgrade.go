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

package kubernetes

import (
	"context"
	"fmt"
	"path"
	"strings"
	"time"

	"github.com/Masterminds/semver/v3"
	v1 "k8s.io/api/core/v1"
	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/kubernetes/cmd/kubeadm/app/apis/kubeadm"

	"github.com/labring/sealos/pkg/runtime/decode"
	"github.com/labring/sealos/pkg/runtime/kubernetes/types"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	upgradeApplyCmd = "kubeadm upgrade apply --certificate-renewal=false --config %s --yes"
	upradeNodeCmd   = "kubeadm upgrade node --certificate-renewal=false --skip-phases preflight"
	//drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
	cordonNodeCmd   = "kubectl cordon %s"
	uncordonNodeCmd = "kubectl uncordon %s"
	daemonReload    = "systemctl daemon-reload"
	restartKubelet  = "systemctl restart kubelet"

	installKubeadmCmd = "cp -rf %s/kubeadm /usr/bin"
	installKubeletCmd = "cp -rf %s/kubelet /usr/bin"
	installKubectlCmd = "cp -rf %s/kubectl /usr/bin"

	writeKubeadmConfig = `cat > %s << EOF
%s
EOF`
)

func (k *KubeadmRuntime) upgradeCluster(version string) error {
	logger.Info("Change ClusterConfiguration up to newVersion if need.")
	conversion, err := k.autoUpdateConfig(version)
	if err != nil {
		return err
	}
	//upgrade master0
	logger.Info("start to upgrade master0")
	err = k.upgradeMaster0(conversion, version)
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

func (k *KubeadmRuntime) upgradeMaster0(conversion *types.ConvertedKubeadmConfig, version string) error {
	master0ip := k.getMaster0IP()
	sver := semver.MustParse(version)
	if gte(sver, V1260) {
		if err := k.changeCRIVersion(master0ip); err != nil {
			return err
		}
	}

	if gte(sver, V1270) {
		if err := k.changeKubeletExtraArgs(master0ip); err != nil {
			return err
		}
	}

	master0Name, err := k.remoteUtil.Hostname(master0ip)
	if err != nil {
		return err
	}
	//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
	master0Name = strings.ToLower(master0Name)
	kubeBinaryPath := k.pathResolver.RootFSBinPath()
	//assure the connection to api-server succeed before executing upgrade cmds
	if err = k.pingAPIServer(); err != nil {
		return err
	}

	// force cri to pull the image
	err = k.imagePull(master0ip, version)
	if err != nil {
		logger.Warn("image pull pre-upgrade failed: %s", err.Error())
	}

	config, err := yaml.MarshalConfigs(&conversion.InitConfiguration, &conversion.ClusterConfiguration)
	if err != nil {
		logger.Error("kubeadm config marshal failed: %s", err.Error())
		return err
	}

	upgradeConfigName := "kubeadm-upgrade.yaml"
	upgradeConfigPath := path.Join(k.pathResolver.EtcPath(), upgradeConfigName)

	err = k.sshCmdAsync(master0ip,
		//install kubeadm:{version} at master0
		fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
		// write kubeadm config to file
		fmt.Sprintf(writeKubeadmConfig, upgradeConfigPath, string(config)),
		//execute  kubeadm upgrade apply {version} at master0
		fmt.Sprintf(upgradeApplyCmd, upgradeConfigPath),
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

		if gte(sver, V1270) {
			if err := k.changeKubeletExtraArgs(ip); err != nil {
				return err
			}
		}

		nodename, err := k.remoteUtil.Hostname(ip)
		if err != nil {
			return err
		}
		//default nodeName in k8s is the lower case of their hostname because of DNS protocol.
		nodename = strings.ToLower(nodename)
		kubeBinaryPath := k.pathResolver.RootFSBinPath()
		//assure the connection to api-server succeed before executing upgrade cmds
		if err = k.pingAPIServer(); err != nil {
			return err
		}

		// force cri to pull the image
		err = k.imagePull(ip, version)
		if err != nil {
			logger.Error("image pull pre-upgrade failed: %s", err.Error())
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

func (k *KubeadmRuntime) autoUpdateConfig(version string) (*types.ConvertedKubeadmConfig, error) {
	exp, err := k.getKubeExpansion()
	if err != nil {
		return nil, err
	}
	ctx := context.Background()
	clusterCfg, err := exp.FetchKubeadmConfig(ctx)
	if err != nil {
		return nil, err
	}
	kubeletCfg, err := exp.FetchKubeletConfig(ctx)
	if err != nil {
		return nil, err
	}
	logger.Debug("get cluster configmap data:\n%s", clusterCfg)
	logger.Debug("get kubelet configmap data:\n%s", kubeletCfg)
	allConfig := strings.Join([]string{clusterCfg, kubeletCfg}, "\n---\n")
	defaultKubeadmConfig, err := types.LoadKubeadmConfigs(allConfig, false, decode.CRDFromString)
	if err != nil {
		logger.Error("failed to decode cluster kubeadm config: %s", err)
		return nil, err
	}
	defaultKubeadmConfig.InitConfiguration = kubeadm.InitConfiguration{
		TypeMeta: metaV1.TypeMeta{
			APIVersion: defaultKubeadmConfig.ClusterConfiguration.APIVersion,
		},
	}

	kk := &KubeadmRuntime{
		kubeadmConfig: defaultKubeadmConfig,
	}
	kk.setKubeVersion(version)
	kk.setFeatureGatesConfiguration()
	kk.setInitConfigurationPullPolicy(v1.PullNever)

	conversion, err := kk.kubeadmConfig.ToConvertedKubeadmConfig()
	if err != nil {
		return nil, err
	}
	newClusterData, err := yaml.MarshalConfigs(&conversion.ClusterConfiguration)
	if err != nil {
		logger.Error("failed to encode ClusterConfiguration: %s", err)
		return nil, err
	}
	logger.Debug("update cluster config:\n%s", string(newClusterData))
	err = exp.UpdateKubeadmConfig(ctx, string(newClusterData))
	if err != nil {
		logger.Error("failed to update kubeadm-config with k8s-client: %s", err)
		return nil, err
	}

	newKubeletData, err := yaml.MarshalConfigs(&conversion.KubeletConfiguration)
	if err != nil {
		logger.Error("failed to encode KubeletConfiguration: %s", err)
		return nil, err
	}
	logger.Debug("update kubelet config:\n%s", string(newKubeletData))
	err = exp.UpdateKubeletConfig(ctx, string(newKubeletData))
	if err != nil {
		logger.Error("failed to update kubelet-config with k8s-client: %s", err)
		return nil, err
	}

	return conversion, nil
}

func (k *KubeadmRuntime) pingAPIServer() error {
	timeout := time.Now().Add(1 * time.Minute)
	client, err := k.getKubeInterface()
	if err != nil {
		return err
	}
	for {
		_, err := client.Kubernetes().CoreV1().Nodes().List(context.TODO(), metaV1.ListOptions{})
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

func (k *KubeadmRuntime) changeKubeletExtraArgs(ip string) error {
	return k.sshCmdAsync(ip,
		`FILE="/etc/systemd/system/kubelet.service.d/10-kubeadm.conf" && [ -f "$FILE" ] && sed -i 's/\(--container-runtime=\|--pod-infra-container-image=\)\([^ ]*\)\?//g' "$FILE"`,
		"systemctl daemon-reload",
		"systemctl restart kubelet",
	)
}
