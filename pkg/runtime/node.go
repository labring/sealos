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

	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) joinNodes(newNodesIPList []string) error {
	logger.Info("start to init filesystem join nodes...")
	err := k.bashInit(newNodesIPList)
	if err != nil {
		return fmt.Errorf("filesystem init failed %v", err)
	}
	if err = ssh.WaitSSHReady(k.getSSHInterface(), 6, newNodesIPList...); err != nil {
		return errors.Wrap(err, "join nodes wait for ssh ready time out")
	}

	masters := k.getMasterIPListAndPort()
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range newNodesIPList {
		node := node
		eg.Go(func() error {
			logger.Info("start to join %s as worker", node)
			err = k.ConfigJoinNodeKubeadmToNode(node)
			if err != nil {
				return fmt.Errorf("failed to copy join node kubeadm Config %s %v", node, err)
			}
			err = k.execHostsAppend(node, k.getVip(), k.getAPIServerDomain())
			if err != nil {
				return fmt.Errorf("add apiserver domain hosts failed %v", err)
			}
			err = k.registryAuth(node)
			if err != nil {
				return err
			}
			logger.Info("run ipvs once module: %s", node)
			err = k.execIPVS(node, masters)
			if err != nil {
				return fmt.Errorf("run ipvs once failed %v", err)
			}
			logger.Info("start join node: %s", node)
			cmd := k.Command(k.getKubeVersion(), JoinNode)
			if cmd == "" {
				return fmt.Errorf("get join node command failed, kubernetes version is %s", k.getKubeVersion())
			}
			if err = k.sshCmdAsync(node, cmd); err != nil {
				return fmt.Errorf("failed to join node %s %v", node, err)
			}
			logger.Info("sync ipvs yaml in node: %s", node)
			err = k.execIPVSPod(node, masters)
			if err != nil {
				return fmt.Errorf("generator ipvs static pod failed %v", err)
			}
			logger.Info("succeeded in joining %s as worker", node)
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) ConfigJoinNodeKubeadmToNode(node string) error {
	logger.Info("start to copy kubeadm join Config to node: %s", node)
	data, err := k.generateJoinNodeConfigs(node)
	if err != nil {
		return fmt.Errorf("generator Config join kubeadm Config error: %s", err.Error())
	}
	joinConfigPath := path.Join(k.getContantData().TmpPath(), contants.DefaultJoinNodeKubeadmFileName)
	outConfigPath := path.Join(k.getContantData().EtcPath(), contants.DefaultJoinNodeKubeadmFileName)
	err = file.WriteFile(joinConfigPath, data)
	if err != nil {
		return fmt.Errorf("write Config join kubeadm Config error: %s", err.Error())
	}
	err = k.sshCopy(node, joinConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy Config join kubeadm Config error: %s", err.Error())
	}
	return nil
}
func (k *KubeadmRuntime) deleteNodes(nodes []string) error {
	if len(nodes) == 0 {
		return nil
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodes {
		node := node
		eg.Go(func() error {
			logger.Info("start to delete worker %s", node)
			if err := k.deleteNode(node); err != nil {
				return fmt.Errorf("delete node %s failed %v", node, err)
			}
			logger.Info("succeeded in deleting worker %s", node)
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) deleteNode(node string) error {
	if err := k.resetNode(node); err != nil {
		return err
	}
	//remove node
	if len(k.getMasterIPList()) > 0 {
		return k.deleteKubeNode(node)
	}

	return nil
}
