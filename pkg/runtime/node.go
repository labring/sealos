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
	"github.com/fanux/sealos/pkg/client-go/kubernetes"
	"github.com/fanux/sealos/pkg/cri"
	"github.com/fanux/sealos/pkg/kubeadm"
	"github.com/fanux/sealos/pkg/token"
	"github.com/fanux/sealos/pkg/types/v1beta1"
	"github.com/fanux/sealos/pkg/utils/contants"
	"github.com/fanux/sealos/pkg/utils/file"
	"github.com/fanux/sealos/pkg/utils/logger"
	"github.com/fanux/sealos/pkg/utils/ssh"
	"github.com/pkg/errors"
	"golang.org/x/sync/errgroup"
	v12 "k8s.io/api/core/v1"
	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"path"
)

func (k *KubeadmRuntime) joinNodes(newNodesIPList []string) error {
	err := k.bashInit(newNodesIPList)
	if err != nil {
		return err
	}
	if err := ssh.WaitSSHReady(k.sshInterface, 6, newNodesIPList...); err != nil {
		return errors.Wrap(err, "join nodes wait for ssh ready time out")
	}

	if err := k.loadToken(); err != nil {
		return err
	}

	masters := make([]string, 0)
	for _, master := range k.getMasterIPList() {
		masters = append(masters, fmt.Sprintf("%s:6443", master))
	}
	ipvsCmd, err := k.ctl.IPVS(fmt.Sprintf("%s:6443", k.getVip()), masters)
	if err != nil {
		return fmt.Errorf("get ipvs cmd on once module failed %v", err)
	}
	ipvsYamlCmd, err := k.ctl.StaticPod(k.getVip(), k.resources.Status.Metadata[v1beta1.DefaultVarLvscare], masters)
	if err != nil {
		return fmt.Errorf("get ipvs static pod cmd failed %v", err)
	}

	eg, _ := errgroup.WithContext(context.Background())
	for _, node := range newNodesIPList {
		node := node
		eg.Go(func() error {
			logger.Info("start to join %s as worker", node)
			err := k.ConfigJoinNodeKubeadmToNode(node, k.token)
			if err != nil {
				return fmt.Errorf("failed to copy join node kubeadm config %s %v", node, err)
			}
			err = k.execHostsAppend(node,k.getVip(),k.getAPIServerDomain())
			if err != nil {
				return fmt.Errorf("add apiserver domain hosts failed %v", err)
			}
			err = k.registryAuth(node)
			if err != nil {
				return err
			}
			err = k.execProxySync(node, ipvsCmd)
			if err != nil {
				return fmt.Errorf("run ipvs once failed %v", err)
			}

			cmd := k.Command(k.getKubeVersion(), JoinNode)
			if err := k.sshCmdAsync(node, cmd); err != nil {
				return fmt.Errorf("failed to join node %s %v", node, err)
			}

			err = k.execProxySync(node, ipvsYamlCmd)
			if err != nil {
				return fmt.Errorf("run ipvs once failed %v", err)
			}

			logger.Info("Succeeded in joining %s as worker", node)
			return err
		})
	}
	return eg.Wait()
}

func (k *KubeadmRuntime) ConfigJoinNodeKubeadmToNode(node string, t *token.Token) error {
	logger.Info("start to copy kubeadm join config to node")
	patches := []string{k.data.KubeKubeadmfile()}
	data, err := kubeadm.GetterJoinNodeKubeadmConfig(k.getKubeVersion(), k.getVip(), cri.DefaultContainerdCRISocket, patches, *t)
	if err != nil {
		return fmt.Errorf("generator config join kubeadm config error: %s", err.Error())
	}
	joinConfigPath := path.Join(k.data.TmpPath(), contants.DefaultJoinNodeKubeadmFileName)
	outConfigPath := path.Join(k.data.EtcPath(), contants.DefaultJoinNodeKubeadmFileName)
	err = file.WriteFile(joinConfigPath, []byte(data))
	if err != nil {
		return fmt.Errorf("write config join kubeadm config error: %s", err.Error())
	}
	err = k.sshCopy(node, joinConfigPath, outConfigPath)
	if err != nil {
		return fmt.Errorf("copy config join kubeadm config error: %s", err.Error())
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
		cli, err := kubernetes.NewKubernetesClient(k.data.AdminFile(), k.getMaster0IPAPIServer())
		if err != nil {
			return err
		}
		ctx := context.Background()
		nodeList, err := cli.Kubernetes().CoreV1().Nodes().List(ctx, v1.ListOptions{})
		if err != nil {
			return err
		}
		var nodeType *v12.Node
		for _, n := range nodeList.Items {
			for _, addr := range n.Status.Addresses {
				if addr.Type == v12.NodeInternalIP && addr.Address == node {
					nodeType = &n
				}
			}
		}

		if nodeType == nil {
			return fmt.Errorf("not find node")
		}
		deletePropagation := v1.DeletePropagationBackground
		return cli.Kubernetes().CoreV1().Nodes().Delete(ctx, nodeType.Name, v1.DeleteOptions{PropagationPolicy: &deletePropagation})
	}

	return nil
}
