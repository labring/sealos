package runtime

import (
	"fmt"
)

const (
	AdminConf                = "admin.conf"
	ControllerConf           = "controller-manager.conf"
	SchedulerConf            = "scheduler.conf"
	KubeletConf              = "kubelet.conf"
)

func (k *KubeadmRuntime) UpdateCert() error {
	if err := k.sshCmdAsync(k.getMaster0IP(), "rm -rf /etc/kubernetes/admin.conf"); err != nil {
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
	if err := k.SendJoinMasterKubeConfigs([]string{k.getMaster0IP()}, AdminConf, ControllerConf, SchedulerConf, KubeletConf); err != nil {
		return err
	}

	return nil
}
