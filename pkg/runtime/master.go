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
	"context"
	"fmt"
	"path"
	"sync"

	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/fanux/sealos/pkg/utils/strings"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) InitMaster0() error {
	logger.Info("start to init master0...")

	err := k.registryAuth(k.getMaster0IP())
	if err != nil {
		return err
	}
	err = k.execHostsAppend(k.getMaster0IP(), k.getMaster0IP(), k.getAPIServerDomain())
	if err != nil {
		return fmt.Errorf("add apiserver domain hosts failed %v", err)
	}

	cmdInit := k.Command(k.getKubeVersion(), InitMaster)
	if cmdInit == "" {
		return fmt.Errorf("get init master command failed, kubernetes version is %s", k.getKubeVersion())
	}
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

// sendJoinCPConfig send join CP masters configuration
func (k *KubeadmRuntime) sendJoinCPConfig(joinMaster []string) error {
	k.Mutex = &sync.Mutex{}
	eg, _ := errgroup.WithContext(context.Background())
	for _, master := range joinMaster {
		master := master
		eg.Go(func() error {
			k.Lock()
			defer k.Unlock()
			return k.ConfigJoinMasterKubeadmToMaster(master)
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) ConfigJoinMasterKubeadmToMaster(master string) error {
	logger.Info("start to copy kubeadm join Config to master: %s", master)
	data, err := k.generateJoinMasterConfigs(master)
	if err != nil {
		return fmt.Errorf("generator Config join master kubeadm Config error: %s", err.Error())
	}
	joinConfigPath := path.Join(k.getContantData().TmpPath(), contants.DefaultJoinMasterKubeadmFileName)
	outConfigPath := path.Join(k.getContantData().EtcPath(), contants.DefaultJoinMasterKubeadmFileName)
	err = file.WriteFile(joinConfigPath, data)
	if err != nil {
		return fmt.Errorf("write Config join master kubeadm Config error: %s", err.Error())
	}
	err = k.sshCopy(master, joinConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy Config join master kubeadm Config error: %s", err.Error())
	}
	return nil
}

func (k *KubeadmRuntime) joinMasters(masters []string) error {
	if len(masters) == 0 {
		return nil
	}
	logger.Info("start to init filesystem join masters...")
	err := k.bashInit(masters)
	if err != nil {
		return fmt.Errorf("filesystem init failed %v", err)
	}

	if err = ssh.WaitSSHReady(k.getSSHInterface(), 6, masters...); err != nil {
		return errors.Wrap(err, "join masters wait for ssh ready time out")
	}

	if err = k.CopyStaticFiles(masters); err != nil {
		return err
	}

	if err = k.SendJoinMasterKubeConfigs(masters, AdminConf, ControllerConf, SchedulerConf); err != nil {
		return err
	}
	// TODO only needs send ca?
	if err = k.sendNewCertAndKey(masters); err != nil {
		return err
	}

	if err = k.sendJoinCPConfig(masters); err != nil {
		return err
	}
	cmd := k.Command(k.getKubeVersion(), JoinMaster)
	if cmd == "" {
		return fmt.Errorf("get join master command failed, kubernetes version is %s", k.getKubeVersion())
	}
	//
	for _, master := range masters {
		logger.Info("start to join %s as master", master)
		err = k.registryAuth(master)
		if err != nil {
			return err
		}

		logger.Info("start to generator cert %s as master", master)
		err = k.execCert(master)
		if err != nil {
			return fmt.Errorf("generator master cert failed %v", err)
		}

		err = k.execHostsAppend(master, k.getMaster0IP(), k.getAPIServerDomain())
		if err != nil {
			return fmt.Errorf("add master0 apiserver domain hosts failed %v", err)
		}

		err = k.sshCmdAsync(master, cmd)
		if err != nil {
			return fmt.Errorf("exec kubeadm join failed %v", err)
		}

		err = k.execHostsAppend(master, master, k.getAPIServerDomain())
		if err != nil {
			return fmt.Errorf("add master0 apiserver domain hosts failed %v", err)
		}

		err = k.copyMasterKubeConfig(master)
		if err != nil {
			return err
		}
		logger.Info("succeeded in joining %s as master", master)
	}

	return k.syncNodeIPVSYaml(strings.RemoveDuplicate(append(k.getMasterIPList(), masters...)))
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
	if err := k.resetNode(master); err != nil {
		return err
	}
	//remove master
	masterIPs := strings.SliceRemoveStr(k.getMasterIPList(), master)
	if len(masterIPs) > 0 {
		if err := k.deleteKubeNode(master); err != nil {
			return fmt.Errorf("delete master %s failed %v", master, err)
		}
	}

	return k.syncNodeIPVSYaml(masterIPs)
}
