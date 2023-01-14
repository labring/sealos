package runtime

import (
	"context"

	v1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/sealos/pkg/utils/logger"
)

func (k *KubeadmRuntime) GetIPList() ([]string, error) {
	cli, err := kubernetes.NewKubernetesClient(k.getContentData().AdminFile(), k.getMaster0IPAPIServer())
	if err != nil {
		logger.Info("get k8s-client failure : %s", err)
		return nil, err
	}
	nodeList, err := cli.Kubernetes().CoreV1().Nodes().List(context.TODO(), v1.ListOptions{})
	if err != nil {
		return nil, err
	}
	nodes := nodeList.Items
	ips := make([]string, len(nodes))
	for i := range nodes {
		ips = append(ips, nodes[i].Status.Addresses[0].Address)
	}
	return ips, nil
}
