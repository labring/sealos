// Copyright © 2022 sealos.
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

	"golang.org/x/exp/slices"
	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	removeKubeConfig        = "rm -rf $HOME/.kube"
	remoteCleanMasterOrNode = `if which kubeadm;then kubeadm reset -f %s;fi && \
rm -rf /etc/kubernetes/ && \
rm -rf /etc/cni && rm -rf /opt/cni && \
rm -rf %s && (ip link delete kube-ipvs0 >/dev/null 2>&1 || true)
`
)

func (k *KubeadmRuntime) reset() error {
	k.resetNodes(k.getNodeIPAndPortList())
	k.resetMasters(k.getMasterIPAndPortList())
	return nil
}

func (k *KubeadmRuntime) resetNodes(nodes []string) {
	logger.Info("start to reset nodes: %v", nodes)
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodes {
		node := node
		eg.Go(func() error {
			if err := k.resetNode(node, nil); err != nil {
				logger.Error("delete node %s failed %v", node, err)
			}
			return nil
		})
	}
	if err := eg.Wait(); err != nil {
		return
	}
}

func (k *KubeadmRuntime) resetMasters(nodes []string) {
	logger.Info("start to reset masters: %v", nodes)
	for _, node := range nodes {
		if err := k.resetNode(node, nil); err != nil {
			logger.Error("delete master %s failed %v", node, err)
		}
	}
}

func (k *KubeadmRuntime) resetNode(node string, cleanHook func()) error {
	logger.Info("start to reset node: %s", node)
	resetCmd := fmt.Sprintf(remoteCleanMasterOrNode, vlogToStr(k.klogLevel), k.getEtcdDataDir())

	resetCmdErr := k.sshCmdAsync(node, resetCmd)
	if cleanHook != nil {
		cleanHook()
	}

	if resetCmdErr != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", resetCmd, resetCmdErr)
	}
	removeKubeConfigErr := k.sshCmdAsync(node, removeKubeConfig)
	if removeKubeConfigErr != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", removeKubeConfig, removeKubeConfigErr)
	}
	if slices.Contains(k.cluster.GetNodeIPAndPortList(), node) {
		ipvscleanErr := k.execIPVSClean(node)
		if ipvscleanErr != nil {
			logger.Error("failed to clean node route and ipvs failed, %v", ipvscleanErr)
		}
	}
	return nil
}
