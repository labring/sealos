package kube

import (
	"context"
	"net"

	"github.com/pkg/errors"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/labring/sealos/pkg/client-go/kubernetes"
)

type K8s interface {
	ListNodes() (*v1.NodeList, error)
	ListNodesByLabel(label string) (*v1.NodeList, error)
	ListNodeIPByLabel(label string) ([]net.IP, error)
	ListResources(gvr schema.GroupVersionResource, namespace string, opts metav1.ListOptions) (*unstructured.UnstructuredList, error)
}

type K8sClient struct {
	//client *kubernetes.Clientset
	Client kubernetes.Client
}

func NewK8sClient(kubeconfig string, apiServer string) (K8s, error) {
	client, err := kubernetes.NewKubernetesClient(kubeconfig, apiServer)
	if err != nil {
		return nil, err
	}

	//config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfig)
	//if err != nil {
	//	return nil, errors.Wrap(err, "failed to build kube config")
	//}
	//
	//clientSet, err := kubernetes.NewForConfig(config)
	//if err != nil {
	//	return nil, err
	//}

	return &K8sClient{
		Client: client,
	}, nil
}

func (c *K8sClient) ListNodes() (*v1.NodeList, error) {

	nodes, err := c.Client.Kubernetes().CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get cluster nodes")
	}
	return nodes, nil
}

func (c *K8sClient) ListNodesByLabel(label string) (*v1.NodeList, error) {
	nodes, err := c.Client.Kubernetes().CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{LabelSelector: label})
	if err != nil {
		return nil, errors.Wrapf(err, "failed to get cluster nodes")
	}
	return nodes, nil
}

func (c *K8sClient) ListNodeIPByLabel(label string) ([]net.IP, error) {
	var ips []net.IP
	nodes, err := c.ListNodesByLabel(label)
	if err != nil {
		return nil, err
	}
	for _, node := range nodes.Items {
		for _, v := range node.Status.Addresses {
			if v.Type == v1.NodeInternalIP {
				ips = append(ips, net.ParseIP(v.Address))
			}
		}
	}
	return ips, nil
}

func (c *K8sClient) ListResources(gvr schema.GroupVersionResource, namespace string, opts metav1.ListOptions) (*unstructured.UnstructuredList, error) {
	resourceClient := c.Client.KubernetesDynamic().Resource(gvr).Namespace(namespace)
	resourceList, err := resourceClient.List(context.TODO(), opts)
	if err != nil {
		return nil, err
	}
	return resourceList, nil
}
