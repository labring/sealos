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

func (k *KubeadmRuntime) joinMasters(masters []string) error {
	if len(masters) == 0 {
		return nil
	}
	// if its do not Load and Merge kubeadm config via init, need to redo it
	err := k.bashInit(masters)
	if err != nil {
		return err
	}
	if err := ssh.WaitSSHReady(k.sshInterface, 6, masters...); err != nil {
		return errors.Wrap(err, "join masters wait for ssh ready time out")
	}
	//if err := k.GetJoinTokenHashAndKey(); err != nil {
	//	return err
	//}
	//if err := k.CopyStaticFiles(masters); err != nil {
	//	return err
	//}
	//if err := k.SendJoinMasterKubeConfigs(masters, AdminConf, ControllerConf, SchedulerConf); err != nil {
	//	return err
	//}
	//if err := k.sendRegistryCert(masters); err != nil {
	//	return err
	//}
	//// TODO only needs send ca?
	//if err := k.sendNewCertAndKey(masters); err != nil {
	//	return err
	//}
	//if err := k.sendJoinCPConfig(masters); err != nil {
	//	return err
	//}
	//cmd := k.Command(k.getKubeVersion(), JoinMaster)
	//// TODO for test skip dockerd dev version
	//if cmd == "" {
	//	return fmt.Errorf("get join master command failed, kubernetes version is %s", k.getKubeVersion())
	//}
	//
	//for _, master := range masters {
	//	logger.Info("Start to join %s as master", master)
	//
	//	hostname, err := k.getRemoteHostName(master)
	//	if err != nil {
	//		return err
	//	}
	//	cmds := k.JoinMasterCommands(master, cmd, hostname)
	//	ssh, err := k.getHostSSHClient(master)
	//	if err != nil {
	//		return err
	//	}
	//
	//	if err := ssh.CmdAsync(master, cmds...); err != nil {
	//		return fmt.Errorf("exec command failed %s %v %v", master, cmds, err)
	//	}
	//
	//	logger.Info("Succeeded in joining %s as master", master)
	//}
	return nil
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
	ipvsYamlCmd, err := k.getIPVSYamlCmd(masterIPs)
	if err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range k.getNodeIPList() {
		node := node
		eg.Go(func() error {
			err = k.execProxySync(node, ipvsYamlCmd)
			if err != nil {
				return fmt.Errorf("update lvscare static pod failed %s %v", node, err)
			}
			return nil
		})
	}
	return eg.Wait()

}
