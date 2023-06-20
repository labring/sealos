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

package kubernetes

import (
	"context"
	"fmt"

	ckubeadm "k8s.io/kubernetes/cmd/kubeadm/app/constants"

	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
)

var (
	// ControlPlaneComponents defines the control-plane component names
	ControlPlaneComponents = []string{KubeAPIServer, KubeControllerManager, KubeScheduler}
)

// GetStaticPod computes hashes for a single Static Pod resource
func GetStaticPod(client clientset.Interface, nodeName string, component string) (*v1.Pod, error) {
	staticPodName := fmt.Sprintf("%s-%s", component, nodeName)
	return client.CoreV1().Pods(metav1.NamespaceSystem).Get(context.TODO(), staticPodName, metav1.GetOptions{})
}

func GetKubeadmConfig(client clientset.Interface) (*v1.ConfigMap, error) {
	cm, err := client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(context.Background(), ckubeadm.KubeadmConfigConfigMap, metav1.GetOptions{})
	if err != nil {
		return nil, err
	}
	return cm, nil
}
