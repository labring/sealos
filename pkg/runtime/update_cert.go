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
	"fmt"
	"path"

	"golang.org/x/sync/errgroup"
	"k8s.io/apimachinery/pkg/util/json"

	"github.com/labring/sealos/pkg/utils/file"

	"github.com/pkg/errors"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/constants"
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
	if len(certs) != 0 {
		k.setCertSANS(append(k.getCertSANS(), certs...))
	}
	pipeline := []func() error{
		k.updateCert,
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
	cli, err := kubernetes.NewKubernetesClient(k.getContentData().AdminFile(), k.getMaster0IPAPIServer())
	if err != nil {
		return err
	}
	data, err := kubernetes.GetKubeadmConfig(cli.Kubernetes())
	if err != nil {
		return err
	}
	//unmarshal data from configmap
	obj, err := yaml.UnmarshalData([]byte(data.Data[ClusterConfiguration]))
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
	if err := k.updateCert(); err != nil {
		return err
	}
	if err := k.CreateKubeConfig(); err != nil {
		return errors.Wrap(err, "failed to generate kubernetes conf")
	}
	return k.SendJoinMasterKubeConfigs(k.getMasterIPAndPortList()[:1], AdminConf, ControllerConf, SchedulerConf, KubeletConf)
}

func (k *KubeadmRuntime) updateCert() error {
	pipeline := []func() error{
		k.GenerateCert,
		k.SendNewCertAndKeyToMasters,
	}
	for _, f := range pipeline {
		if err := f(); err != nil {
			return fmt.Errorf("failed to generate cert %v", err)
		}
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
				if err = k.sshCmdAsync(m, fmt.Sprintf("crictl stopp %s", podID)); err != nil {
					return err
				}
				//crictl rmp
				if err = k.sshCmdAsync(m, fmt.Sprintf("crictl rmp %s", podID)); err != nil {
					return err
				}
				return nil
			}
			return errors.New("not found apiServer pod running")
		})
	}
	return eg.Wait()
}
