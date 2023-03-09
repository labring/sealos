package logic

import (
	"context"
	"net"
	"os"

	"github.com/cesanta/glog"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"k8s.io/client-go/tools/clientcmd"
)

// Authenticate authenticates user by kubeconfig, ingore error.
func Authenticate(ctx context.Context, reqConfig string) (bool, kubernetes.Client) {
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(reqConfig))
	if err != nil {
		return false, nil
	}
	// replace config.Host to env host.
	sealosHost := GetKubernetesHostFromEnv()
	if sealosHost == "" {
		glog.Error("GetKubernetesHostFromEnv error")
		return false, nil
	}
	config.Host = sealosHost
	// create client
	client, err := kubernetes.NewKubernetesClientByConfig(config)
	if err != nil {
		glog.Error("NewKubernetesClientByConfigString error")
		return false, nil
	}
	// check client by ping apiserver
	res, err := client.Discovery().RESTClient().Get().AbsPath("/readyz").DoRaw(ctx)
	if err != nil {
		glog.Error("Authenticate false, ping apiserver error")
		return false, nil
	}
	if string(res) != "ok" {
		glog.Error("Authenticate false, apiserver response not ok")
		return false, nil
	}
	glog.Info("Authenticate true")
	return true, client
}

func GetKubernetesHostFromEnv() string {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return ""
	}
	return "https://" + net.JoinHostPort(host, port)
}
