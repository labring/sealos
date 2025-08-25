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

package cluster

import (
	"context"
	"fmt"

	"sigs.k8s.io/controller-runtime/pkg/client"

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

func GetClusterID() (string, error) {
	c, err := util.NewKubernetesClient()
	if err != nil {
		return "", err
	}
	kubeSystemNamespace := &corev1.Namespace{}
	if err := c.Get(context.Background(), client.ObjectKey{Namespace: "kube-system", Name: "kube-system"}, kubeSystemNamespace); err != nil {
		return "", err
	}
	res := string(kubeSystemNamespace.UID)
	if len(res) < 8 {
		return "", fmt.Errorf("cluster id is invalid")
	}
	return res[0:8], nil
}
