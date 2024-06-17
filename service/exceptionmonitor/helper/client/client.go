package client

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/labring/sealos/service/exceptionmonitor/api"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

func InitClient() error {
	// connect Kubernetes clusters using kubeconfig

	// 获取当前可执行文件的路径
	ex, err := os.Executable()
	if err != nil {
		panic(err)
	}

	// 获取绝对路径
	absPath := filepath.Dir(ex)

	fmt.Println("Absolute path:", absPath)

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
