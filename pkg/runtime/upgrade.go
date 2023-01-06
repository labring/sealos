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
	str "strings"
	"time"

	metaV1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/versionutil"
)

var (
	upgradeApplyCmd = "kubeadm upgrade apply %s"
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
	//v1.25.0 some flag unsupported
	if versionutil.Compare(version, V1250) {
		logger.Info("start change ClusterConfiguration up to v1.25")
		if err := k.ChangeConfigToV125(); err != nil {
			return err
		}
	}
	//upgrade master0
	err := k.upgradeMaster0(version)
	if err != nil {
		return err
	}
	//upgrade other control-planes and worker nodes
	upgradeNodes := []string{}
	for _, ip := range append(k.getMasterIPList(), k.getNodeIPList()...) {
		if ip == k.getMaster0IP() {
			continue
		}
		upgradeNodes = append(upgradeNodes, ip)
	}
	//wait for restarting api-server that may happen connection refused, or it may fail.
	time.Sleep(5 * time.Second)
	return k.upgradeOtherNodes(upgradeNodes)
}

func (k *KubeadmRuntime) upgradeMaster0(version string) error {
	master0ip := k.getMaster0IP()
	master0Name, err := k.getRemoteInterface().Hostname(master0ip)
	if err != nil {
		return err
	}
	kubeBinaryPath := k.getContentData().RootFSBinPath()
	//install kubeadm:{version} at master0
	err = k.sshCmdAsync(master0ip,
		fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
		//execute  kubeadm upgrade apply {version} at master0
		fmt.Sprintf(upgradeApplyCmd, version),
		// kubectl drain <node-to-drain> --ignore-daemonsets
		// fmt.Sprintf(drainNodeCmd, nodename),
		//kubectl cordon <node-to-cordon>
		fmt.Sprintf(cordonNodeCmd, master0Name),
		//install kubelet:{version},kubectl{version} at master0
		fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
		fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
		//reload kubelet daemon
		daemonReload,
		restartKubelet,
		fmt.Sprintf(uncordonNodeCmd, master0Name),
	)
	return err
}

func (k *KubeadmRuntime) upgradeOtherNodes(ips []string) error {
	for _, ip := range ips {
		nodename, err := k.getRemoteInterface().Hostname(ip)
		if err != nil {
			return err
		}
		kubeBinaryPath := k.getContentData().RootFSBinPath()
		err = k.sshCmdAsync(ip,
			//install kubeadm:{version} at the node
			fmt.Sprintf(installKubeadmCmd, kubeBinaryPath),
			//upgrade other control-plane and nodes
			upradeNodeCmd,
			// kubectl drain <node-to-drain> --ignore-daemonsets
			// fmt.Sprintf(drainNodeCmd, nodename),
			//kubectl cordon <node-to-cordon>
			fmt.Sprintf(cordonNodeCmd, nodename),
			//install kubelet:{version},kubectl{version} at the node
			fmt.Sprintf(installKubectlCmd, kubeBinaryPath),
			fmt.Sprintf(installKubeletCmd, kubeBinaryPath),
			//reload kubelet daemon
			daemonReload,
			restartKubelet,
			fmt.Sprintf(uncordonNodeCmd, nodename),
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func (k *KubeadmRuntime) ChangeConfigToV125() error {
	cli, err := kubernetes.NewKubernetesClient(k.getContentData().AdminFile(), k.getMaster0IPAPIServer())
	if err != nil {
		logger.Info("get k8s-client failure : %s", err)
		return err
	}
	KubeadmConfig, err := cli.Kubernetes().CoreV1().ConfigMaps("kube-system").Get(context.TODO(), "kubeadm-config", metaV1.GetOptions{})
	if err != nil {
		logger.Info("get kubeadmConfig with k8s-client failure : %s", err)
		return err
	}
	ccf := KubeadmConfig.Data[ClusterConfiguration]
	logger.Debug("get configmap data:\n%s", ccf)

	ccf = str.ReplaceAll(ccf, "TTLAfterFinished=true,", "")
	ccf = str.ReplaceAll(ccf, "\n    experimental-cluster-signing-duration: 876000h", "")

	logger.Debug("update config:\n%s", ccf)
	KubeadmConfig.Data[ClusterConfiguration] = ccf
	_, err = cli.Kubernetes().CoreV1().ConfigMaps("kube-system").Update(context.TODO(), KubeadmConfig, metaV1.UpdateOptions{})
	if err != nil {
		logger.Info("update kubeadmConfig with k8s-client failure : %s", err)
		return err
	}
	return nil
}
