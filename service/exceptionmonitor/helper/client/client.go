package client

import (
	"os"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func InitClient() error {
	//TODO Get kubernetes.client through k8s.io/client-go/rest.InClusterConfig()
	kubeconfigPath := "/home/nonroot/kubeconfig/kubeconfig"

	kubeconfig, err := os.ReadFile(kubeconfigPath)
	if err != nil {
		return err
	}

	config, err := clientcmd.RESTConfigFromKubeConfig(kubeconfig)
	if err != nil {
		return err
	}

	//config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	//if err != nil {
	//	return err
	//}
	api.DynamicClient, err = dynamic.NewForConfig(config)
	if err != nil {
		return err
	}
	api.ClientSet, err = kubernetes.NewForConfig(config)
	if err != nil {
		return err
	}
	return nil
}
