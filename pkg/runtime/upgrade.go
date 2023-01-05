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
	"fmt"
)

var (
	upgradeApplyCmd = "kubeadm upgrade apply %s"
	upradeNodeCmd   = "kubeadm upgrade node"
	//drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
	cordonNodeCmd   = "kubectl cordon %s"
	uncordonNodeCmd = "kubectl uncordon %s"
	daemonReload    = "systemctl daemon-reload"
	restartKubelet  = "systemctl restart kubelet"
	kubeBinaryPath  = "/var/lib/sealos/data/default/rootfs/bin"
)

func (k *KubeadmRuntime) upgradeCluster(version string) error {
	//upgrade control-plane
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
	return k.upgradeOtherNodes(upgradeNodes)
}

func (k *KubeadmRuntime) upgradeMaster0(version string) error {
	master0ip := k.getMaster0IP()
	master0Name, err := k.getRemoteInterface().Hostname(master0ip)
	if err != nil {
		return err
	}
	//install kubeadm:{version} at master0
	err = k.sshCmdAsync(master0ip,
		fmt.Sprintf("cp -rf %s/kubeadm /usr/bin", kubeBinaryPath),
		//execute  kubeadm upgrade apply {version} at master0
		fmt.Sprintf(upgradeApplyCmd, version),
		// kubectl drain <node-to-drain> --ignore-daemonsets
		// fmt.Sprintf(drainNodeCmd, nodename),
		//kubectl cordon <node-to-cordon>
		fmt.Sprintf(cordonNodeCmd, master0Name),
		//install kubelet:{version},kubectl{version} at master0
		fmt.Sprintf("cp -rf %s/kubectl /usr/bin", kubeBinaryPath),
		fmt.Sprintf("cp -rf %s/kubelet /usr/bin", kubeBinaryPath),
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
		err = k.sshCmdAsync(ip,
			//install kubeadm:{version} at the node
			fmt.Sprintf("cp -rf %s/kubeadm /usr/bin", kubeBinaryPath),
			//upgrade other control-plane and nodes
			upradeNodeCmd,
			// kubectl drain <node-to-drain> --ignore-daemonsets
			// fmt.Sprintf(drainNodeCmd, nodename),
			//kubectl cordon <node-to-cordon>
			fmt.Sprintf(cordonNodeCmd, nodename),
			//install kubelet:{version},kubectl{version} at the node
			fmt.Sprintf("cp -rf %s/kubectl /usr/bin", kubeBinaryPath),
			fmt.Sprintf("cp -rf %s/kubelet /usr/bin", kubeBinaryPath),
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
