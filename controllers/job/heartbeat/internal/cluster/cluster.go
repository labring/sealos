package cluster

import (
	"context"

	"github.com/labring/sealos/controllers/job/heartbeat/api/v1alpha"
	"github.com/labring/sealos/controllers/job/heartbeat/internal/util"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
)

func GetClusterResources() (*v1alpha.ClusterResource, error) {
	c, err := util.NewKubernetesClient()
	if err != nil {
		return nil, err
	}
	nodeList := &corev1.NodeList{}
	if err := c.List(context.Background(), nodeList); err != nil {
		return nil, err
	}

	totalCPU := resource.NewQuantity(0, resource.DecimalSI)
	totalMem := resource.NewQuantity(0, resource.DecimalSI)

	for _, node := range nodeList.Items {
		cpu := node.Status.Capacity["cpu"]
		mem := node.Status.Capacity["memory"]
		totalCPU.Add(cpu)
		totalMem.Add(mem)
	}

	return &v1alpha.ClusterResource{
		Node: int64(len(nodeList.Items)),
		CPU:  totalCPU.Value(),
		Mem:  totalMem.Value(),
	}, err
}
