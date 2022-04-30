// Copyright © 2021 Alibaba Group Holding Ltd.
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

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	AdminConf      = "admin.conf"
	ControllerConf = "controller-manager.conf"
	SchedulerConf  = "scheduler.conf"
	KubeletConf    = "kubelet.conf"
)

func (k *KubeadmRuntime) UpdateCert() error {
	logger.Info("start to generate cert and kubeConfig...")
	if err := k.sshCmdAsync(k.getMaster0IPAndPort(), "rm -rf /etc/kubernetes/admin.conf"); err != nil {
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
	return k.SendJoinMasterKubeConfigs([]string{k.getMaster0IP()}, AdminConf, ControllerConf, SchedulerConf, KubeletConf)
}
