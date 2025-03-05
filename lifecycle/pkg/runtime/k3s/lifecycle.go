// Copyright © 2023 sealos.
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

package k3s

import (
	"context"
	"fmt"

	"github.com/labring/sealos/pkg/utils/iputils"

	"github.com/labring/sealos/pkg/utils/strings"

	"golang.org/x/exp/slices"

	"github.com/labring/sealos/pkg/utils/logger"

	"golang.org/x/sync/errgroup"
)

func (k *K3s) resetNodes(nodes []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range nodes {
		node := nodes[i]
		eg.Go(func() error {
			return k.resetNode(node)
		})
	}
	return eg.Wait()
}

func (k *K3s) removeNodes(nodes []string) error {
	eg, _ := errgroup.WithContext(context.Background())
	for i := range nodes {
		node := nodes[i]
		eg.Go(func() error {
			if err := k.deleteNode(node); err != nil {
				return err
			}
			return k.resetNode(node)
		})
	}
	return eg.Wait()
}

func (k *K3s) resetNode(host string) error {
	logger.Info("start to reset node: %s", host)
	removeKubeConfig := "rm -rf $HOME/.kube"
	removeKubeConfigErr := k.execer.CmdAsync(host, removeKubeConfig)
	if removeKubeConfigErr != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", removeKubeConfig, removeKubeConfigErr)
	}
	if slices.Contains(k.cluster.GetNodeIPAndPortList(), host) {
		ipvsclearErr := k.remoteUtil.IPVSClean(host, k.getVipAndPort())
		if ipvsclearErr != nil {
			logger.Error("failed to clear ipvs rules for node %s: %v", host, ipvsclearErr)
		}
	}
	return nil
}

// TODO: remove from API
func (k *K3s) deleteNode(node string) error {
	//remove master
	masterIPs := k.cluster.GetMasterIPList()
	if slices.Contains(k.cluster.GetMasterIPAndPortList(), node) {
		masterIPs = strings.RemoveFromSlice(k.cluster.GetMasterIPList(), node)
	}
	if len(masterIPs) > 0 {
		// TODO: do we need draining first?
		if err := k.removeNode(node); err != nil {
			logger.Warn(fmt.Errorf("delete nodes %s failed %v", node, err))
		}
	}
	return nil
}

func (k *K3s) removeNode(ip string) error {
	logger.Info("start to remove node from k3s %s", ip)
	nodeName, err := k.execer.CmdToString(k.cluster.GetMaster0IPAndPort(), fmt.Sprintf("kubectl get nodes -o wide | awk '$6==\"%s\" {print $1}'", iputils.GetHostIP(ip)), "")
	if err != nil {
		return fmt.Errorf("cannot get node with ip address %s: %v", ip, err)
	}
	logger.Debug("found node name is %s, we will delete it", nodeName)
	return k.execer.CmdAsync(k.cluster.GetMaster0IPAndPort(), fmt.Sprintf("kubectl delete node %s --ignore-not-found=true", nodeName))
}
