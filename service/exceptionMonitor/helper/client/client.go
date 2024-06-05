package client

import (
	"exceptionMonitor/api"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func InitClient() error {
	// connect Kubernetes clusters using kubeconfig

	kubeconfigPath := "./config/" + api.ClusterName + "_kubeconfig"
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		return err
	}
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
