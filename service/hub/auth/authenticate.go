package auth

import (
	"context"
	"net"
	"os"

	"github.com/cesanta/glog"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/service/hub/api"
	"k8s.io/client-go/tools/clientcmd"
)

func init() {
	glog.Info("authn plugin init function called")
}

type SealosAuthenticate struct {
	api.Authenticator
}

func (a SealosAuthenticate) Authenticate(user string, password api.PasswordString) (bool, api.Labels, kubernetes.Client, error) {
	glog.Info("Authenticate for user:", user)

	// user can log in anonymously
	if user == "" && password == "" {
		glog.Info("Authenticated anonymously")
		return true, api.Labels{}, nil, nil
	}

	// if user/password is specified
	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(password))
	if err != nil {
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	// replace config.Host to env host.
	sealosHost := GetKubernetesHostFromEnv()
	if sealosHost == "" {
		glog.Error("GetKubernetesHostFromEnv error")
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	config.Host = sealosHost
	// create client
	client, err := kubernetes.NewKubernetesClientByConfig(config)
	if err != nil {
		glog.Error("NewKubernetesClientByConfigString error")
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	// check client by ping apiserver
	res, err := client.Discovery().RESTClient().Get().AbsPath("/readyz").DoRaw(context.Background())
	if err != nil {
		glog.Error("Authenticate false, ping apiserver error")
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	if string(res) != "ok" {
		glog.Error("Authenticate false, apiserver response not ok")
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	glog.Info("Authenticate true")
	return true, api.Labels{}, client, nil
}

func GetKubernetesHostFromEnv() string {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if len(host) == 0 || len(port) == 0 {
		return ""
	}
	return "https://" + net.JoinHostPort(host, port)
}

func (a SealosAuthenticate) Stop() {
}

func NewSealosAuthn() SealosAuthenticate {
	return SealosAuthenticate{}
}
