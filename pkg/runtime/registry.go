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
	"github.com/fanux/sealos/pkg/remote"
	"github.com/fanux/sealos/pkg/utils/logger"
)

const DefaultCPFmt = "mkdir -p %s && cp -rf  %s/* %s/"

func (k *KubeadmRuntime) ApplyRegistry() error {
	logger.Info("start to apply registry")
	err := k.sshInterface.CmdAsync(k.registry.IP, fmt.Sprintf(DefaultCPFmt, k.registry.Data, k.data.KubeRegistryPath(), k.registry.Data))
	if err != nil {
		return fmt.Errorf("copy registry data failed %v", err)
	}
	ip := k.cluster.GetMaster0IP()
	err = k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.InitRegistryBash()))
	if err != nil {
		return fmt.Errorf("exec registry.sh failed %v", err)
	}

	return nil
}

func (k *KubeadmRuntime) DeleteRegistry() error {
	logger.Info("delete registry in master0...")
	ip := k.cluster.GetMaster0IP()
	err := k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.CleanRegistryBash()))
	if err != nil {
		return fmt.Errorf("exec clean-registry.sh failed %v", err)
	}
	return nil
}

func (k *KubeadmRuntime) registryAuth(ip string) error {
	logger.Info("registry auth in node %s", ip)
	err := remote.BashSync(k.data, k.sshInterface, ip, k.ctl.HostsAdd(k.registry.IP, k.registry.Domain))
	if err != nil {
		return fmt.Errorf("add registry hosts failed %v", err)
	}

	err = k.sshInterface.CmdAsync(ip, k.envInterface.WrapperShell(ip, k.bash.AuthBash()))
	if err != nil {
		return fmt.Errorf("exec auth.sh failed %v", err)
	}
	return nil
}
