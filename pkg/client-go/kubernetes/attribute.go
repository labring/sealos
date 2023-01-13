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

package kubernetes

import (
	"context"
	"fmt"

	"github.com/labring/sealos/pkg/utils/iputils"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	client "k8s.io/client-go/kubernetes"
)

func GetHostNameFromInternalIP(client client.Interface, nodeIP string) (string, error) {
	ip := iputils.GetHostIP(nodeIP)
	nodeList, err := client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("get node list failed: %v", err)
	}
	for _, node := range nodeList.Items {
		for _, address := range node.Status.Addresses {
			if address.Type == corev1.NodeInternalIP {
				if address.Address == ip {
					return node.Name, nil
				}
			}
		}
	}
	return "", fmt.Errorf("get hostname from internal ip %v failed", ip)
}

func GetHostNameFromExternalIP(client client.Interface, nodeIP string) (string, error) {
	ip := iputils.GetHostIP(nodeIP)
	nodeList, err := client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("get node list failed: %v", err)
	}
	for _, node := range nodeList.Items {
		for _, address := range node.Status.Addresses {
			if address.Type == corev1.NodeExternalIP {
				if address.Address == ip {
					return node.Name, nil
				}
			}
		}
	}
	return "", fmt.Errorf("get hostname from external ip %v failed", ip)
}
