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
	"path"

	"github.com/fanux/sealos/pkg/passwd"
	"github.com/fanux/sealos/pkg/utils/file"

	"github.com/fanux/sealos/pkg/utils/logger"
)

const DefaultCPFmt = "mkdir -p %s && cp -rf  %s/* %s/"

func (k *KubeadmRuntime) htpasswd() error {
	htpasswdPath := path.Join(k.data.EtcPath(), "registry_htpasswd")
	if k.registry.Username == "" && k.registry.Password == "" {
		return nil
	}
	data := passwd.Htpasswd(k.registry.Username, k.registry.Password)
	return file.WriteFile(htpasswdPath, []byte(data))
}

func (k *KubeadmRuntime) ApplyRegistry() error {
	logger.Info("start to apply registry")
	err := k.sshCmdAsync(k.registry.IP, fmt.Sprintf(DefaultCPFmt, k.registry.Data, k.data.RootFSRegistryPath(), k.registry.Data))
	if err != nil {
		return fmt.Errorf("copy registry data failed %v", err)
	}
	ip := k.getMaster0IP()
	err = k.htpasswd()
	if err != nil {
		return fmt.Errorf("generator registry htpasswd failed %v", err)
	}
	err = k.execInitRegistry(ip)
	if err != nil {
		return fmt.Errorf("exec registry.sh failed %v", err)
	}

	return nil
}

func (k *KubeadmRuntime) DeleteRegistry() error {
	logger.Info("delete registry in master0...")
	ip := k.getMaster0IP()
	if err := k.execCleanRegistry(ip); err != nil {
		return fmt.Errorf("exec clean-registry.sh failed %v", err)
	}
	return nil
}

func (k *KubeadmRuntime) registryAuth(ip string) error {
	logger.Info("registry auth in node %s", ip)
	err := k.execHostsAppend(ip, k.registry.IP, k.registry.Domain)
	if err != nil {
		return fmt.Errorf("add registry hosts failed %v", err)
	}

	err = k.execAuth(ip)
	if err != nil {
		return fmt.Errorf("exec auth.sh failed %v", err)
	}
	return nil
}
