package runtime

import (
	"fmt"
)

func (k *KubeadmRuntime) UpdateCert() error {
	if err := k.sshInterface.CmdAsync(k.cluster.GetMaster0IP(), "rm -rf /etc/kubernetes/admin.conf"); err != nil {
		return err
	}
	pipeline := []func() error{
		k.GenerateCert,
		k.CreateKubeConfig,
	}
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v", err)
		}
	}
	if err := k.SendJoinMasterKubeConfigs([]string{k.cluster.GetMaster0IP()}, AdminConf, ControllerConf, SchedulerConf, KubeletConf); err != nil {
		return err
	}

	return nil
}
