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
	"github.com/fanux/sealos/pkg/utils/logger"
)

func (k *KubeadmRuntime) InitMaster0() error {
	logger.Info("start to init master0...")

	err := k.registryAuth(k.getMaster0IP())
	if err != nil {
		return err
	}
	err = k.execHostsAppend(k.getMaster0IP(),k.getMaster0IP(),k.getAPIServerDomain())
	if err != nil {
		return fmt.Errorf("add apiserver domain hosts failed %v", err)
	}

	cmdInit := k.Command(k.getKubeVersion(), InitMaster)
	err = k.sshCmdAsync(k.getMaster0IP(), cmdInit)
	if err != nil {
		return fmt.Errorf("init master0 failed, error: %s. Please clean and reinstall", err.Error())
	}
	err = k.copyMasterKubeConfig(k.getMaster0IP())
	if err != nil {
		return err
	}
	return nil
}
