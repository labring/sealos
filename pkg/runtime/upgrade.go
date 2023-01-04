package runtime

import (
	"fmt"
	"time"
)

const (
	upgradeApplyCmd = "kubeadm upgrade apply %s"
	upradeNodeCmd   = "kubeadm upgrade node"
	drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
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
	return k.upgradeNode(upgradeNodes, version)
}

func (k *KubeadmRuntime) upgradeMaster0(version string) error {
	master0ip := k.getMaster0IP()
	//install kubeadm:{version} at master0
	err := k.sshCmdAsync(master0ip,
		fmt.Sprintf("cp -rf %s/kubeadm /usr/bin", kubeBinaryPath),
		//execute  kubeadm upgrade apply {version} at master0
		fmt.Sprintf(upgradeApplyCmd, version),
		//install kubelet:{version},kubectl{version} at master0
		fmt.Sprintf("cp -rf %s/kubectl /usr/bin", kubeBinaryPath),
		fmt.Sprintf("cp -rf %s/kubelet /usr/bin", kubeBinaryPath),
		//reload kubelet daemon
		daemonReload,
		restartKubelet,
	)
	return err
}

func (k *KubeadmRuntime) upgradeNode(ips []string, versoin string) error {
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
			//kubectl drain <node-to-drain> --ignore-daemonsets
			fmt.Sprintf(drainNodeCmd, nodename),
			//install kubelet:{version},kubectl{version} at the node
			fmt.Sprintf("cp -rf %s/kubectl /usr/bin", kubeBinaryPath),
			fmt.Sprintf("cp -rf %s/kubelet /usr/bin", kubeBinaryPath),
			//reload kubelet daemon
			daemonReload,
			restartKubelet,
		)
		if err != nil {
			return err
		}
		//kubectl uncordon <node-to-uncordon>
		err = k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
		now := time.Now()
		//restart api-server takes a few seconds
		for err != nil {
			if time.Now().After(now.Add(2 * time.Minute)) {
				return err
			}
			time.Sleep(5 * time.Second)
			err = k.sshCmdAsync(ip, fmt.Sprintf(uncordonNodeCmd, nodename))
		}
	}

	return nil
}
