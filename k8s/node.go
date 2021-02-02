package k8s

import (
	"context"
	"fmt"
	"os"
	"time"

	v1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"
	"k8s.io/client-go/transport"
)

const (
	HostnameLabel        = "kubernetes.io/hostname"
	NodeRoleLabel        = "node-role.kubernetes.io/master"
	MaxRetries           = 5
	RetryInterval        = 5
	WrapTransportTimeout = 30
)

var (
	KubeDefaultConfigPath = getUserHome() + "/.sealos/admin.conf"
)

func getUserHome() string {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Println("get user home err:", err)
		os.Exit(-1)
	}
	return home
}

// NewClient is get clientSet by kubeConfig
func NewClient(kubeConfigPath string, k8sWrapTransport transport.WrapperFunc) (*kubernetes.Clientset, error) {
	// use the current admin kubeconfig
	var config *rest.Config
	var err error
	//if home, _ := os.UserHomeDir(); home != "" && kubeConfigPath != "" {
	//	kubeConfigPath = filepath.Join(home, ".kube", "config")
	//}
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

// GetNodeList is get all nodes
func GetNodeList(k8sClient *kubernetes.Clientset) (*v1.NodeList, error) {
	return k8sClient.CoreV1().Nodes().List(context.TODO(), metav1.ListOptions{})
}

// GetNodeListByLabel is get node list by label
func GetNodeListByLabel(k8sClient *kubernetes.Clientset, label string) (*v1.NodeList, error) {
	listOption := &metav1.ListOptions{LabelSelector: label}
	return k8sClient.CoreV1().Nodes().List(context.TODO(), *listOption)
}

// GetNodeIpByName is get node internalIp by nodeName
func GetNodeIpByName(k8sClient *kubernetes.Clientset, nodeName string) (ip string, err error) {
	node, err := k8sClient.CoreV1().Nodes().Get(context.TODO(), nodeName, metav1.GetOptions{})
	if err != nil {
		return "", err
	}

	for _, v := range node.Status.Addresses {
		if v.Type == v1.NodeInternalIP {
			ip = v.Address
			return ip, nil
		}
	}
	return "", apierrors.NewNotFound(schema.GroupResource{}, nodeName)
}

// GetNodeNameByIp is get node name by node ip
func GetNodeNameByIp(k8sClient *kubernetes.Clientset, ip string) (name string, err error) {
	nodes, err := GetNodeList(k8sClient)
	if err != nil {
		return "", err
	}
	for _, node := range nodes.Items {
		for _, v := range node.Status.Addresses {
			if v.Type == v1.NodeInternalIP && ip == v.Address {
				return node.Name, nil
			}
		}
	}
	return "", fmt.Errorf("ip [%s] is not fount in kubernetes nodes", ip)
}

// GetNodeNameByLabel is get node name by label
func GetNodeNameByLabel(k8sClient *kubernetes.Clientset, label string) ([]string, error) {
	var ns []string
	nodes, err := GetNodeListByLabel(k8sClient, label)
	if err != nil {
		return nil, err
	}
	for _, node := range nodes.Items {
		ns = append(ns, node.Name)
	}
	if len(ns) != 0 {
		return ns, nil
	}

	return nil, fmt.Errorf("label %s is not fount in kubernetes nodes", label)
}

// GetNodeIpByLabel is is get node ip by label
func GetNodeIpByLabel(k8sClient *kubernetes.Clientset, label string) ([]string, error) {
	var ips []string
	if label == "" {
		return ips, nil
	}
	nodes, err := GetNodeListByLabel(k8sClient, label)
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
	if len(ips) != 0 {
		return ips, nil
	}
	return nil, fmt.Errorf("label %s is not fount in kubernetes nodes", label)
}

// GetNodeByName is get node internalIp by nodeName
func GetNodeByName(k8sClient *kubernetes.Clientset, nodeName string) (node *v1.Node, err error) {
	return k8sClient.CoreV1().Nodes().Get(context.TODO(), nodeName, metav1.GetOptions{})
}

// IsNodeReady return true when node is ready
func IsNodeReady(node v1.Node) bool {
	nodeConditions := node.Status.Conditions
	for _, condition := range nodeConditions {
		if condition.Type == v1.NodeReady && condition.Status == v1.ConditionTrue {
			return true
		}
	}
	return false
}

// TransToIP is use kubernetes label or hostname/ip to get ip
func TransToIP(k8sClient *kubernetes.Clientset, label string, hostname []string) ([]string, error) {
	var ips []string
	ips, err := GetNodeIpByLabel(k8sClient, label)
	if err != nil {
		return nil, err
	}
	resHost, resIp := getHostnameAndIp(hostname)
	ips = append(ips, resIp...)
	for _, node := range resHost {
		ip, err := GetNodeIpByName(k8sClient, node)
		if err == nil {
			ips = append(ips, ip)
		}
	}
	ips = removeRep(ips)
	return ips, nil
}
