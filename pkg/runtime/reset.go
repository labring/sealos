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

package runtime

import (
	"context"
	"fmt"

	"golang.org/x/sync/errgroup"

	"github.com/labring/sealos/pkg/bootstrap"
	"github.com/labring/sealos/pkg/constants"
	"github.com/labring/sealos/pkg/utils/logger"
)

const (
	removeKubeConfig        = "rm -rf .kube"
	remoteCleanMasterOrNode = `if which kubeadm;then kubeadm reset -f %s;fi && \
rm -rf /etc/kubernetes/ && \
rm -rf /etc/cni && rm -rf /opt/cni && \
rm -rf %s
`
)

func (k *KubeadmRuntime) reset() error {
	k.resetNodes(k.getNodeIPAndPortList())
	k.resetMasters(k.getMasterIPAndPortList())
	bs := bootstrap.New(k.Cluster)
	err := bs.Reset(k.Cluster.GetAllIPS()...)
	return err
}

func (k *KubeadmRuntime) resetNodes(nodes []string) {
	logger.Info("start to reset nodes: %v", nodes)
	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range nodes {
		node := node
		eg.Go(func() error {
			if err := k.resetNode(node); err != nil {
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
		if err := k.resetNode(node); err != nil {
			logger.Error("delete master %s failed %v", node, err)
		}
	}
}

func (k *KubeadmRuntime) resetNode(node string) error {
	logger.Info("start to reset node: %s", node)
	resetCmd := fmt.Sprintf(remoteCleanMasterOrNode, vlogToStr(k.vlog), k.getEtcdDataDir())
	shim := bootstrap.NewImageShimHelper(k.getSSHInterface(), k.getMaster0IPAndPort())
	deleteShimCmd := shim.DeleteCMD(k.getContentData().RootFSPath())
	if err := k.sshCmdAsync(node, resetCmd); err != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", resetCmd, err)
	}
	if err := k.sshCmdAsync(node, removeKubeConfig); err != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", removeKubeConfig, err)
	}
	if err := k.execIPVSClean(node); err != nil {
		logger.Error("failed to clean node route and ipvs failed, %v", err)
	}
	if err := k.sshCmdAsync(node, deleteShimCmd); err != nil {
		logger.Error("failed to clean node, exec command %s failed, %v", deleteShimCmd, err)
	}
	err := k.execClean(node)
	if err != nil {
		logger.Error("exec clean.sh failed %v", err)
	}
	err = k.execHostsDelete(node, k.getRegistry().Domain)
	if err != nil {
		logger.Error("delete registry hosts failed %v", err)
	}
	err = k.execHostsDelete(node, k.getAPIServerDomain())
	if err != nil {
		logger.Error("delete apiserver hosts failed %v", err)
	}
	err = k.execHostsDelete(node, constants.DefaultLvscareDomain)
	if err != nil {
		return fmt.Errorf("add lvscare domain hosts failed %v", err)
	}
	return nil
}
