package runtime

import (
	"context"
	"fmt"
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
	k.resetNodes(k.getNodeIPList())
	k.resetMasters(k.getMasterIPList())
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
	if err := k.sshCmdAsync(node, fmt.Sprintf(RemoteCleanMasterOrNode, vlogToStr(k.vlog)),
		RemoveKubeConfig); err != nil {
		return err
	}
	err := k.execClean(node)
	if err != nil {
		return fmt.Errorf("exec clean.sh failed %v", err)
	}
	err = k.execHostsDelete(node,k.registry.Domain)
	if err != nil {
		return fmt.Errorf("delete registry hosts failed %v", err)
	}
	err = k.execHostsDelete(node,k.getAPIServerDomain())
	if err != nil {
		return fmt.Errorf("delete apiserver hosts failed %v", err)
	}

	return nil
}
