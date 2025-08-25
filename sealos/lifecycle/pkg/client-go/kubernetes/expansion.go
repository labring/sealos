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
	str "strings"

	v1 "k8s.io/api/core/v1"
	kerrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	clientset "k8s.io/client-go/kubernetes"
	ckubeadm "k8s.io/kubernetes/cmd/kubeadm/app/constants"

	"github.com/labring/sealos/pkg/utils/iputils"
	"github.com/labring/sealos/pkg/utils/logger"
)

var (
	// ControlPlaneComponents defines the control-plane component names
	ControlPlaneComponents = []string{KubeAPIServer, KubeControllerManager, KubeScheduler}
)

type Expansion interface {
	FetchStaticPod(ctx context.Context, nodeName string, component string) (*v1.Pod, error)
	FetchKubeadmConfig(ctx context.Context) (string, error)
	UpdateKubeadmConfig(ctx context.Context, clusterConfig string) error
	FetchKubeletConfig(ctx context.Context) (string, error)
	UpdateKubeletConfig(ctx context.Context, kubeletConfig string) error
	FetchHostNameFromInternalIP(ctx context.Context, nodeIP string) (string, error)
}

type kubeExpansion struct {
	client clientset.Interface
}

func NewKubeExpansion(client clientset.Interface) Expansion {
	return &kubeExpansion{
		client: client,
	}
}

func (ke *kubeExpansion) FetchStaticPod(ctx context.Context, nodeName string, component string) (*v1.Pod, error) {
	staticPodName := fmt.Sprintf("%s-%s", component, nodeName)
	return ke.client.CoreV1().Pods(metav1.NamespaceSystem).Get(ctx, staticPodName, metav1.GetOptions{})
}
func (ke *kubeExpansion) FetchKubeadmConfig(ctx context.Context) (string, error) {
	cm, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(ctx, ckubeadm.KubeadmConfigConfigMap, metav1.GetOptions{})
	if err != nil {
		return "", err
	}
	return cm.Data[ckubeadm.ClusterConfigurationConfigMapKey], nil
}
func (ke *kubeExpansion) UpdateKubeadmConfig(ctx context.Context, clusterConfig string) error {
	cm, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(ctx, ckubeadm.KubeadmConfigConfigMap, metav1.GetOptions{})
	if err != nil {
		return err
	}
	cm.Data[ckubeadm.ClusterConfigurationConfigMapKey] = clusterConfig
	_, err = ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}
func (ke *kubeExpansion) FetchKubeletConfig(ctx context.Context) (string, error) {
	cm, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(ctx, ckubeadm.KubeletBaseConfigurationConfigMap, metav1.GetOptions{})
	if err != nil {
		if kerrors.IsNotFound(err) {
			logger.Info("cannot find configMap %q, try to detect older versions", ckubeadm.KubeletBaseConfigurationConfigMap)
			data, err := ke.fetchOldKubeletConfig(ctx)
			if err != nil {
				return "", err
			}
			if err = ke.cloneOldKubeletConfig(ctx, data); err != nil {
				return "", err
			}
			return data, nil
		}
		return "", err
	}
	return cm.Data[ckubeadm.KubeletBaseConfigurationConfigMapKey], nil
}
func (ke *kubeExpansion) UpdateKubeletConfig(ctx context.Context, kubeletConfig string) error {
	cm, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Get(ctx, ckubeadm.KubeletBaseConfigurationConfigMap, metav1.GetOptions{})
	if err != nil {
		return err
	}
	cm.Data[ckubeadm.KubeletBaseConfigurationConfigMap] = kubeletConfig
	_, err = ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Update(ctx, cm, metav1.UpdateOptions{})
	return err
}
func (ke *kubeExpansion) FetchHostNameFromInternalIP(ctx context.Context, nodeIP string) (string, error) {
	ip := iputils.GetHostIP(nodeIP)
	nodeList, err := ke.client.CoreV1().Nodes().List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("get node list failed: %v", err)
	}
	for _, node := range nodeList.Items {
		for _, address := range node.Status.Addresses {
			if address.Type == v1.NodeInternalIP {
				if address.Address == ip {
					return node.Name, nil
				}
			}
		}
	}
	return "", fmt.Errorf("cannot find host with internal ip %v", ip)
}

func (ke *kubeExpansion) fetchOldKubeletConfig(ctx context.Context) (string, error) {
	kubeletBaseConfigurationConfigMapPrefix := fmt.Sprintf("%s-", ckubeadm.KubeletBaseConfigurationConfigMap)
	cms, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).List(ctx, metav1.ListOptions{})
	if err != nil {
		return "", err
	}
	for _, cm := range cms.Items {
		if str.HasPrefix(cm.Name, kubeletBaseConfigurationConfigMapPrefix) {
			return cm.Data[ckubeadm.KubeletBaseConfigurationConfigMapKey], nil
		}
	}
	return "", fmt.Errorf("cannot find config map with prefix %q", kubeletBaseConfigurationConfigMapPrefix)
}

func (ke *kubeExpansion) cloneOldKubeletConfig(ctx context.Context, data string) error {
	cm := &v1.ConfigMap{Data: map[string]string{}}
	cm.Name = ckubeadm.KubeletBaseConfigurationConfigMap
	cm.Data[ckubeadm.KubeletBaseConfigurationConfigMapKey] = data
	_, err := ke.client.CoreV1().ConfigMaps(metav1.NamespaceSystem).Create(ctx, cm, metav1.CreateOptions{})
	if err != nil {
		return err
	}
	return nil
}
