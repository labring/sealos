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

	"golang.org/x/sync/errgroup"
)

func (k *KubeadmRuntime) joinNodes(newNodesIPList []string) error {
	var err error
	if err = ssh.WaitReady(k.execer, 6, newNodesIPList...); err != nil {
		return fmt.Errorf("join nodes wait for ssh ready time out: %w", err)
	}

	masters := k.getMasterIPListAndHTTPSPort()
	if err = k.setKubernetesToken(); err != nil {
		return err
	}
	if err = k.mergeWithBuiltinKubeadmConfig(); err != nil {
		return err
	}
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range newNodesIPList {
		node := node
		eg.Go(func() error {
			logger.Info("start to join %s as worker", node)
			k.mu.Lock()
			err = k.copyKubeadmConfigToNode(node)
			if err != nil {
				return fmt.Errorf("failed to copy join node kubeadm config %s %v", node, err)
			}
			k.mu.Unlock()
			logger.Info("run ipvs once module: %s", node)
			err = k.execIPVS(node, masters)
			if err != nil {
				return fmt.Errorf("run ipvs once failed %v", err)
			}
			logger.Info("start join node: %s", node)
			joinCmd := k.Command(JoinNode)
			if joinCmd == "" {
				return fmt.Errorf("get join node command failed, kubernetes version is %s", k.getKubeVersion())
			}
			if err = k.sshCmdAsync(node, joinCmd); err != nil {
				return fmt.Errorf("failed to join node %s %v", node, err)
			}
			logger.Info("succeeded in joining %s as worker", node)
			return nil
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) copyKubeadmConfigToNode(node string) error {
	logger.Info("start to copy kubeadm join config to node: %s", node)
	data, err := k.generateJoinNodeConfigs(node)
	if err != nil {
		return fmt.Errorf("failed to generate join kubeadm config: %v", err)
	}
	joinConfigPath := path.Join(k.pathResolver.TmpPath(), defaultJoinNodeKubeadmFileName)
	outConfigPath := path.Join(k.pathResolver.ConfigsPath(), defaultJoinNodeKubeadmFileName)
	err = file.WriteFile(joinConfigPath, data)
	if err != nil {
		return fmt.Errorf("write config join kubeadm config error: %s", err.Error())
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
	return k.resetNode(node, func() {
		//remove node
		if len(k.getMasterIPList()) > 0 {
			if err := k.removeNode(node); err != nil {
				logger.Warn(fmt.Errorf("delete node %s failed %v", node, err))
			}
		}
	})
}
