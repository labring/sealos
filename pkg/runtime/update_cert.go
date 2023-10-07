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
	"context"
	"errors"
	"fmt"
	"path"

	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/yaml"
)

const (
	AdminConf      = "admin.conf"
	ControllerConf = "controller-manager.conf"
	SchedulerConf  = "scheduler.conf"
	KubeletConf    = "kubelet.conf"
)

func (k *KubeadmRuntime) UpdateCert(certs []string) error {
	//set sans to kubeadm config object
	if err := k.ConvertInitConfigConversion(setCGroupDriverAndSocket, setCertificateKey); err != nil {
		return err
	}
	setCertSANS := func() error {
		if err := k.fetchKubeadmConfig(); err != nil {
			return err
		}
		if len(certs) != 0 {
			k.setCertSANS(append(k.getCertSANS(), certs...))
		}
		return nil
	}
	pipeline := []func() error{
		setCertSANS,
		k.initCert,
		k.saveNewKubeadmConfig,
		k.uploadConfigFromKubeadm,
		k.deleteAPIServer,
		k.showKubeadmCert,
	}
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v", err)
		}
	}
	return nil
}

func (k *KubeadmRuntime) saveNewKubeadmConfig() error {
	logger.Info("start to save new kubeadm config...")
	data, err := k.getKubeExpansion().FetchKubeadmConfig(context.Background())
	if err != nil {
		return err
	}
	//unmarshal data from configmap
	obj, err := yaml.UnmarshalData([]byte(data))
	if err != nil {
		return err
	}
	logger.Debug("current cluster config data: %+v", obj)
	//set certs to obj interface
	err = unstructured.SetNestedStringSlice(obj, k.getCertSANS(), "apiServer", "certSANs")
	if err != nil {
		return err
	}
	certPath := path.Join(k.getContentData().EtcPath(), constants.DefaultUpdateKubeadmFileName)
	return yaml.MarshalYamlToFile(certPath, obj)
}

func (k *KubeadmRuntime) uploadConfigFromKubeadm() error {
	logger.Info("start to upload kubeadm config for inCluster ...")
	outConfigPath := path.Join(k.getContentData().EtcPath(), constants.DefaultUpdateKubeadmFileName)
	data, err := file.ReadAll(outConfigPath)
	if err != nil {
		return err
	}
	logger.Debug("current update yaml data is %s", string(data))
	err = k.sshCopy(k.getMaster0IPAndPort(), outConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy config update kubeadm yaml error: %s", err.Error())
	}
	cmd := k.Command(k.getKubeVersion(), UpdateCluster)
	if cmd == "" {
		return fmt.Errorf("get config update kubeadm command failed, kubernetes version is %s", k.getKubeVersion())
	}
	if err = k.sshCmdAsync(k.getMaster0IPAndPort(), cmd); err != nil {
		return fmt.Errorf("failed to exec update kubeadm config %s %v", k.getMaster0IPAndPort(), err)
	}
	return nil
}

func (k *KubeadmRuntime) UpdateCertByInit() error {
	logger.Info("start to generate cert and kubeConfig...")
	for _, ipAndPort := range k.getMasterIPAndPortList() {
		if err := k.sshCmdAsync(ipAndPort, "rm -rf /etc/kubernetes/admin.conf"); err != nil {
			return err
		}
	}
	if err := k.initCert(); err != nil {
		return err
	}
	if err := k.CreateKubeConfig(); err != nil {
		return fmt.Errorf("failed to generate kubernetes conf: %w", err)
	}
	return k.SendJoinMasterKubeConfigs(k.getMasterIPAndPortList()[:1], AdminConf, ControllerConf, SchedulerConf, KubeletConf)
}

func (k *KubeadmRuntime) initCert() error {
	pipeline := []func() error{
		k.GenerateCert,
		k.syncCert,
	}
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v", err)
		}
	}
	return nil
}

func (k *KubeadmRuntime) syncCert() error {
	for _, master := range k.getMasterIPAndPortList()[1:] {
		logger.Debug("start to generate cert for master %s", master)
		err := k.execCert(master)
		if err != nil {
			return fmt.Errorf("failed to create cert for master %s: %v", master, err)
		}

		err = k.copyMasterKubeConfig(master)
		if err != nil {
			return err
		}
		logger.Info("succeeded generate cert %s as master", master)
	}
	return nil
}

func (k *KubeadmRuntime) showKubeadmCert() error {
	certCheck := "kubeadm certs check-expiration"
	return k.sshCmdAsync(k.getMaster0IPAndPort(), fmt.Sprintf("%s%s", certCheck, vlogToStr(k.vlog)))
}

func (k *KubeadmRuntime) deleteAPIServer() error {
	podIDSh := fmt.Sprintf("crictl ps -a --name %s -o json", kubernetes.KubeAPIServer)
	type crictlPS struct {
		Containers []struct {
			ID           string `json:"id"`
			PodSandboxID string `json:"podSandboxId"`
		} `json:"containers"`
	}
	logger.Info("delete pod apiserver from crictl")
	eg, _ := errgroup.WithContext(context.Background())
	for _, master := range k.getMasterIPAndPortList() {
		m := master
		eg.Go(func() error {
			podIDJson, err := k.sshCmdToString(m, podIDSh)
			if err != nil {
				return err
			}
			ps := &crictlPS{}
			if err = json.Unmarshal([]byte(podIDJson), ps); err != nil {
				return err
			}
			if len(ps.Containers) > 0 {
				podID := ps.Containers[0].PodSandboxID[:13]
				logger.Debug("found podID %s in %s", podID, m)
				//crictl stopp
				if err = k.sshCmdAsync(m, fmt.Sprintf("crictl --timeout=10s stopp %s", podID)); err != nil {
					return err
				}
				//crictl rmp
				return k.sshCmdAsync(m, fmt.Sprintf("crictl rmp %s", podID))
			}
			return errors.New("not found apiServer pod running")
		})
	}
	return eg.Wait()
}
