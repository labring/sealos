package client

import (
	"exceptionMonitor/api"
	"fmt"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func InitClient() error {
	// connect Kubernetes clusters using kubeconfig

	kubeconfigPath := "./config/" + api.ClusterName + "_kubeconfig"
	config, err := clientcmd.BuildConfigFromFlags("", kubeconfigPath)
	if err != nil {
		fmt.Printf("Unable to get k8s config  %s \n", err.Error())
	}
	api.DynamicClient, err = dynamic.NewForConfig(config)
	if err != nil {
		fmt.Printf("Unable to get k8s dynamicClient %s \n", err.Error())
	}
	api.ClientSet, err = kubernetes.NewForConfig(config)
	if err != nil {
		fmt.Printf("Unable to get k8s clientSet %s \n", err.Error())
	}
	return nil
}
