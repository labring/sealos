package client

import (
	"fmt"
	"os"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func InitClient() error {
	// connect Kubernetes clusters using kubeconfig

	cwd, err := os.Getwd()
	if err != nil {
		fmt.Println(err)
	}

	fmt.Println("Current working directory:", cwd)

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
