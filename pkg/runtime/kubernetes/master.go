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

package kubernetes

import (
	"context"
	"fmt"
	"path"

	"github.com/labring/sealos/pkg/ssh"
	"github.com/labring/sealos/pkg/utils/file"
	"github.com/labring/sealos/pkg/utils/logger"
	"github.com/labring/sealos/pkg/utils/strings"

	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) InitMaster0() error {
	logger.Info("start to init master0...")
	master0 := k.getMaster0IPAndPort()
	if err := k.imagePull(master0, ""); err != nil {
		return err
	}
	cmdInit := k.Command(InitMaster)
	if cmdInit == "" {
		return fmt.Errorf("get init master command failed, kubernetes version is %s", k.getKubeVersion())
	}
	err := k.sshCmdAsync(master0, cmdInit)
	if err != nil {
		return fmt.Errorf("init master0 failed, error: %s. Please clean and reinstall", err.Error())
	}
	return k.copyMasterKubeConfig(master0)
}

func (k *KubeadmRuntime) imagePull(hostAndPort, version string) error {
	if version == "" {
		version = k.getKubeVersion()
	}
	imagePull := fmt.Sprintf("kubeadm config images pull --cri-socket unix://%s  --kubernetes-version %s %s", k.cluster.GetImageEndpoint(), version, vlogToStr(k.klogLevel))
	err := k.sshCmdAsync(hostAndPort, imagePull)
	if err != nil {
		return fmt.Errorf("master pull image failed, error: %s", err.Error())
	}
	return nil
}

// sendJoinCPConfig send join CP masters configuration
func (k *KubeadmRuntime) sendJoinCPConfig(joinMaster []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for _, master := range joinMaster {
		master := master
		eg.Go(func() error {
			k.mu.Lock()
			defer k.mu.Unlock()
			return k.ConfigJoinMasterKubeadmToMaster(master)
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) ConfigJoinMasterKubeadmToMaster(master string) error {
	logger.Info("start to copy kubeadm join config to master: %s", master)
	data, err := k.generateJoinMasterConfigs(master)
	if err != nil {
		return fmt.Errorf("failed to generate join master kubeadm config: %s", err.Error())
	}
	joinConfigPath := path.Join(k.pathResolver.TmpPath(), defaultJoinMasterKubeadmFileName)
	outConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinMasterKubeadmFileName)
	err = file.WriteFile(joinConfigPath, data)
	if err != nil {
		return fmt.Errorf("write config join master kubeadm config error: %s", err.Error())
	}
	err = k.sshCopy(master, joinConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy config join master kubeadm config error: %s", err.Error())
	}
	return nil
}

func (k *KubeadmRuntime) joinMasters(masters []string) error {
	if len(masters) == 0 {
		return nil
	}
	logger.Info("start to send manifests to masters...")
	var err error
	if err = ssh.WaitReady(k.execer, 6, masters...); err != nil {
		return fmt.Errorf("join masters wait for ssh ready time out: %w", err)
	}

	if err = k.copyStaticFiles(masters); err != nil {
		return err
	}

	if err = k.SendJoinMasterKubeConfigs(masters, AdminConf, ControllerConf, SchedulerConf); err != nil {
		return err
	}
	// TODO only needs send ca?
	if err = k.sendNewCertAndKey(masters); err != nil {
		return err
	}
	if err = k.setKubernetesToken(); err != nil {
		return err
	}
	if err = k.sendJoinCPConfig(masters); err != nil {
		return err
	}
	// does it necessary?
	if err = k.mergeWithBuiltinKubeadmConfig(); err != nil {
		return err
	}
	joinCmd := k.Command(JoinMaster)
	if joinCmd == "" {
		return fmt.Errorf("get join master command failed, kubernetes version is %s", k.getKubeVersion())
	}
	for _, master := range masters {
		logger.Info("start to join %s as master", master)
		if err = k.imagePull(master, ""); err != nil {
			return err
		}
		logger.Debug("start to generate cert for master %s", master)
		err = k.execCert(master)
		if err != nil {
			return fmt.Errorf("failed to create cert for master %s: %v", master, err)
		}

		err = k.sshCmdAsync(master, joinCmd)
		if err != nil {
			return fmt.Errorf("exec kubeadm join in %s failed %v", master, err)
		}

		err = k.execHostsAppend(master, master, k.getAPIServerDomain())
		if err != nil {
			return fmt.Errorf("add master0 apiserver domain hosts in %s failed %v", master, err)
		}

		err = k.copyMasterKubeConfig(master)
		if err != nil {
			return err
		}
		logger.Info("succeeded in joining %s as master", master)
	}
	return nil
}

func (k *KubeadmRuntime) SyncNodeIPVS(mastersIPList, nodeIPList []string) error {
	return k.syncNodeIPVSYaml(strings.RemoveDuplicate(mastersIPList), nodeIPList)
}

func (k *KubeadmRuntime) deleteMasters(masters []string) error {
	if len(masters) == 0 {
		return nil
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, master := range masters {
		master := master
		eg.Go(func() error {
			logger.Info("start to delete master %s", master)
			if err := k.deleteMaster(master); err != nil {
				logger.Error("delete master %s failed %v", master, err)
			} else {
				logger.Info("succeeded in deleting master %s", master)
			}
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) deleteMaster(master string) error {
	return k.resetNode(master, func() {
		//remove master
		masterIPs := strings.RemoveFromSlice(k.getMasterIPList(), master)
		if len(masterIPs) > 0 {
			// TODO: do we need draining first?
			if err := k.removeNode(master); err != nil {
				logger.Warn(fmt.Errorf("delete master %s failed %v", master, err))
			}
		}
	})
}
