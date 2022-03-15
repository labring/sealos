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
	"github.com/fanux/sealos/pkg/cmd"
	"github.com/fanux/sealos/pkg/env"
	"github.com/fanux/sealos/pkg/utils/logger"
	"golang.org/x/sync/errgroup"
)

const (
	RemoveKubeConfig        = "rm -rf .kube"
	RemoteCleanMasterOrNode = `if which kubeadm;then kubeadm reset -f %s;fi && \
modprobe -r ipip  && lsmod && \
rm -rf /etc/cni && rm -rf /opt/cni && \
rm -rf /var/lib/etcd && rm -rf /var/etcd 
`
)

func (k *KubeadmRuntime) reset() error {
	err := k.DeleteRegistry()
	k.resetNodes(k.cluster.GetNodeIPList())
	k.resetMasters(k.cluster.GetMasterIPList())
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
	if err := k.sshInterface.CmdAsync(node, fmt.Sprintf(RemoteCleanMasterOrNode, vlogToStr(k.vlog)),
		RemoveKubeConfig); err != nil {
		return err
	}
	envProcessor := env.NewEnvProcessor(k.cluster)
	err := k.sshInterface.CmdAsync(node, envProcessor.WrapperShell(node, k.bash.CleanBash()))
	if err != nil {
		return fmt.Errorf("exec clean.sh failed %v", err)
	}
	err = cmd.RemoteBashSync(k.data, k.sshInterface, node, k.ctl.HostsDelete(k.registry.Domain))
	if err != nil {
		return fmt.Errorf("delete registry hosts failed %v", err)
	}
	err = cmd.RemoteBashSync(k.data, k.sshInterface, node, k.ctl.HostsDelete(k.cluster.GetAPIServerDomain()))
	if err != nil {
		return fmt.Errorf("delete apiserver hosts failed %v", err)
	}

	return nil
}
