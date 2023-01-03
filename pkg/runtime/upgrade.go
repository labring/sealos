package runtime

const (
	upgradeApplyCmd = "kubeadm upgrade apply %s"
	upradeNodeCmd   = "kubeadm upgrade node"
	drainNodeCmd    = "kubectl drain %s --ignore-daemonsets"
	uncordonNodeCmd = "kubectl uncordon %s"
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

	//execute  kubeadm upgrade apply {version} at master0
	k.upgradeApply(master0ip, version)

	//install kubelet:{version},kubectl{version} at master0
	//and reload kubelet daemon

	k.reloadKubelet(master0ip)
	return nil
}

func (k *KubeadmRuntime) upgradeApply(ip string, version string) error {

	return nil
}

func (k *KubeadmRuntime) upgradeNode(ips []string, versoin string) error {
	for _, ip := range ips {
		//install kubeadm:{version} at the node

		//kubectl drain <node-to-drain> --ignore-daemonsets

		//install kubelet:{version},kubectl{version} at the node

		//kubectl uncordon <node-to-uncordon>

		k.reloadKubelet(ip)
	}

	return nil
}

func (k *KubeadmRuntime) reloadKubelet(ip string) error {
	cmd := []string{"systemctl daemon-reload", "systemctl restart kubelet"}
	return k.getSSHInterface().CmdAsync(ip, cmd...)
}
