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
	"fmt"
	"github.com/fanux/sealos/pkg/cmd"
	"github.com/fanux/sealos/pkg/utils/logger"
)

const (
	AdminConf                = "admin.conf"
	ControllerConf           = "controller-manager.conf"
	SchedulerConf            = "scheduler.conf"
	KubeletConf              = "kubelet.conf"
	KUBECONTROLLERCONFIGFILE = "/etc/kubernetes/controller-manager.conf"
	KUBESCHEDULERCONFIGFILE  = "/etc/kubernetes/scheduler.conf"
)

func (k *KubeadmRuntime) InitMaster0() error {
	logger.Info("start to init master0...")

	if err := k.SendJoinMasterKubeConfigs([]string{k.cluster.GetMaster0IP()}, AdminConf, ControllerConf, SchedulerConf, KubeletConf); err != nil {
		return err
	}
	err := cmd.RemoteBashSync(k.data, k.sshInterface, k.cluster.GetMaster0IP(), k.ctl.HostsAdd(k.cluster.GetMaster0IP(), k.cluster.GetAPIServerDomain()))
	if err != nil {
		return fmt.Errorf("add apiserver domain hosts failed %v", err)
	}

	cmdInit := k.Command(k.getKubeVersion(), InitMaster)

	err = k.sshInterface.CmdAsync(k.cluster.GetMaster0IP(), cmdInit)
	if err != nil {
		return fmt.Errorf("init master0 failed, error: %s. Please clean and reinstall", err.Error())
	}
	err = k.sshInterface.CmdAsync(k.cluster.GetMaster0IP(), RemoteCopyKubeConfig)
	if err != nil {
		return err
	}
	return nil
}
