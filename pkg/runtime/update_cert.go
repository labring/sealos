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
	"path"

	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/yaml"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	AdminConf      = "admin.conf"
	ControllerConf = "controller-manager.conf"
	SchedulerConf  = "scheduler.conf"
	KubeletConf    = "kubelet.conf"
)

func (k *KubeadmRuntime) UpdateCert(certs []string) error {
	defer func() {
		certSANs := k.getCertSANS()
		data := map[string]any{"certSANs": certSANs}
		yamlData, err := yaml.MarshalYamlConfigs(data)
		if err != nil {
			logger.Error("convert cert config error: %s", err.Error())
			return
		}
		outConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultCertFileName)
		logger.Debug("write cert config to %s", outConfigPath)
		err = file.WriteFile(outConfigPath, yamlData)
		if err != nil {
			logger.Error("write cert config error: %s", err.Error())
		}
	}()
	return k.updateCert(certs)
}

func (k *KubeadmRuntime) UpdateCertByInit() error {
	return k.updateCert([]string{})
}

func (k *KubeadmRuntime) updateCert(certs []string) error {
	if len(certs) != 0 {
		k.setCertSANS(append(k.getCertSANS(), certs...))
	}
	logger.Info("start to generate cert and kubeConfig...")
	for _, ipAndPort := range k.getMasterIPAndPortList() {
		if err := k.sshCmdAsync(ipAndPort, "rm -rf /etc/kubernetes/admin.conf"); err != nil {
			return err
		}
	}

	pipeline := []func() error{
		k.GenerateCert,
		k.SendNewCertAndKeyToMasters,
		k.CreateKubeConfig,
	}
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v", err)
		}
	}
	return k.SendJoinMasterKubeConfigs(k.getMasterIPList(), AdminConf, ControllerConf, SchedulerConf, KubeletConf)
}
