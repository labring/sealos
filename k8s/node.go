package k8s

import (
	"context"
	"fmt"
	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/transport"
	"os"
	"path/filepath"
	"strings"
	"time"
)

const (
	HostnameLabel         = "kubernetes.io/hostname"
	NodeRoleLabel         = "node-role.kubernetes.io/master"
	MaxRetries            = 5
	RetryInterval         = 5
	WrapTransportTimeout  = 30
	KubeDefaultConfigPath = "/root/.kube/config"
)

func NewClient(kubeConfigPath string, k8sWrapTransport transport.WrapperFunc) (*kubernetes.Clientset, error) {
	// use the current admin kubeconfig
	var config *rest.Config
	var err error
	if home, _ := os.UserHomeDir(); home != "" && kubeConfigPath != "" {
		kubeConfigPath = filepath.Join(home, ".kube", "config")
	}
	if config, err = rest.InClusterConfig(); err != nil {
		if config, err = clientcmd.BuildConfigFromFlags("", kubeConfigPath); err != nil {
			return nil, err
		}
	}

	if k8sWrapTransport != nil {
		config.WrapTransport = k8sWrapTransport
	}
	config.Timeout = time.Second * time.Duration(WrapTransportTimeout)
	K8sClientSet, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return K8sClientSet, nil
}

func GetNodeList(k8sClient *kubernetes.Clientset) (*v1.NodeList, error) {
	return k8sClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
}

func GetNode(k8sClient *kubernetes.Clientset, nodeName string) (*v1.Node, error) {
	var listErr error
	for retries := 0; retries < MaxRetries; retries++ {
		nodes, err := GetNodeList(k8sClient)
		if err != nil {
			listErr = err
			time.Sleep(time.Second * RetryInterval)
			continue
		}
		// reset listErr back to nil
		listErr = nil
		for _, node := range nodes.Items {
			if strings.ToLower(node.Labels[HostnameLabel]) == strings.ToLower(nodeName) {
				return &node, nil
			}
		}
		time.Sleep(time.Second * RetryInterval)
	}
	if listErr != nil {
		return nil, listErr
	}
	return nil, apierrors.NewNotFound(schema.GroupResource{}, nodeName)
}

func GetNodeByLabel(k8sClient *kubernetes.Clientset, label string) ([]string, error) {
	var listErr error
	var ns []string
	for retries := 0; retries < MaxRetries; retries++ {
		nodes, err := GetNodeList(k8sClient)
		if err != nil {
			listErr = err
			time.Sleep(time.Second * RetryInterval)
			continue
		}
		// reset listErr back to nil
		listErr = nil
		for _, node := range nodes.Items {
			for k, v := range node.Labels {
				if label == fmt.Sprintf("%s=%s", k, v) {
					ns = append(ns, node.Name)
				}
			}
		}
		if ns != nil {
			return ns, nil
		}
		time.Sleep(time.Second * RetryInterval)
	}
	return nil, listErr
}

func IsNodeReady(node v1.Node) bool {
	nodeConditions := node.Status.Conditions
	for _, condition := range nodeConditions {
		if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue {
			return true
		}
	}
	return false
}
