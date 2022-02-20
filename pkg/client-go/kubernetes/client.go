// Copyright © 2021 sealos.
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

	"github.com/fanux/sealos/pkg/utils/contants"

	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/version"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

type Client struct {
	client *kubernetes.Clientset
}

type NamespacePod struct {
	Namespace v1.Namespace
	PodList   *v1.PodList
}

type NamespaceSvc struct {
	Namespace   v1.Namespace
	ServiceList *v1.ServiceList
}

func Newk8sClient() (*Client, error) {
	kubeconfig := contants.DefaultKubeConfigFile()
	// use the current context in kubeconfig
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfig)
	if err != nil {
		return nil, errors.Wrap(err, "failed to build kube config")
	}

	clientSet, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}

	return &Client{
		client: clientSet,
	}, nil
}

func (c *Client) ListNodes() (*v1.NodeList, error) {
	nodes, err := c.client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get cluster nodes")
	}
	return nodes, nil
}

func (c *Client) UpdateNode(node v1.Node) (*v1.Node, error) {
	n, err := c.client.CoreV1().Nodes().Update(context.TODO(), &node, metav1.UpdateOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to update cluster node")
	}
	return n, nil
}

func (c *Client) DeleteNode(name string) error {
	if err := c.client.CoreV1().Nodes().Delete(context.TODO(), name, metav1.DeleteOptions{}); err != nil {
		return errors.Wrapf(err, "failed to delete cluster node %s", name)
	}
	return nil
}

func (c *Client) listNamespaces() (*v1.NamespaceList, error) {
	namespaceList, err := c.client.CoreV1().Namespaces().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get namespaces")
	}
	return namespaceList, nil
}

func (c *Client) ListNodesByLabel(label string) (*v1.NodeList, error) {
	nodes, err := c.client.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{LabelSelector: label})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get cluster nodes")
	}
	return nodes, nil
}

func (c *Client) ListNodeIPByLabel(label string) ([]string, error) {
	var ips []string
	nodes, err := c.ListNodesByLabel(label)
	if err != nil {
		return nil, err
	}
	for _, node := range nodes.Items {
		for _, v := range node.Status.Addresses {
			if v.Type == v1.NodeInternalIP {
				ips = append(ips, v.Address)
			}
		}
	}
	return ips, nil
}

func (c *Client) ListAllNamespacesPods() ([]*NamespacePod, error) {
	namespaceList, err := c.listNamespaces()
	if err != nil {
		return nil, err
	}
	var namespacePodList []*NamespacePod
	for _, ns := range namespaceList.Items {
		pods, err := c.client.CoreV1().Pods(ns.Name).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			return nil, errors.Wrapf(err, "failed to get all namespace pods")
		}
		namespacePod := NamespacePod{
			Namespace: ns,
			PodList:   pods,
		}
		namespacePodList = append(namespacePodList, &namespacePod)
	}

	return namespacePodList, nil
}

func (c *Client) ListAllNamespacesSvcs() ([]*NamespaceSvc, error) {
	namespaceList, err := c.listNamespaces()
	if err != nil {
		return nil, err
	}
	var namespaceSvcList []*NamespaceSvc
	for _, ns := range namespaceList.Items {
		svcs, err := c.client.CoreV1().Services(ns.Name).List(context.TODO(), metav1.ListOptions{})
		if err != nil {
			return nil, errors.Wrapf(err, "failed to get all namespace pods")
		}
		namespaceSvc := NamespaceSvc{
			Namespace:   ns,
			ServiceList: svcs,
		}
		namespaceSvcList = append(namespaceSvcList, &namespaceSvc)
	}
	return namespaceSvcList, nil
}

func (c *Client) GetEndpointsList(namespace string) (*v1.EndpointsList, error) {
	endpointsList, err := c.client.CoreV1().Endpoints(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get endpoint in namespace %s", namespace)
	}
	return endpointsList, nil
}

func (c *Client) ListSvcs(namespace string) (*v1.ServiceList, error) {
	svcs, err := c.client.CoreV1().Services(namespace).List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get all namespace pods")
	}
	return svcs, nil
}

func (c *Client) GetClusterVersion() (*version.Info, error) {
	info, err := c.client.Discovery().ServerVersion()
	if err != nil {
		return nil, err
	}
	return info, nil
}

func (c *Client) ListKubeSystemPodsStatus() (bool, error) {
	pods, err := c.client.CoreV1().Pods("kube-system").List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return false, errors.Wrapf(err, "failed to get kube-system namespace pods")
	}
	// pods.Items maybe nil
	if len(pods.Items) == 0 {
		return false, nil
	}
	for _, pod := range pods.Items {
		// pod.Status.ContainerStatus == nil because of pod contain initcontainer
		if len(pod.Status.ContainerStatuses) == 0 {
			continue
		}
		if !pod.Status.ContainerStatuses[0].Ready {
			return false, nil
		}
	}
	return true, nil
}
