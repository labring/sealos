package auth

import (
	"context"

	"github.com/cesanta/glog"
	"github.com/labring/sealos/controllers/user/controllers/helper"
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

	config, err := clientcmd.RESTConfigFromKubeConfig([]byte(password))
	if err != nil {
		return false, api.Labels{}, nil, api.ErrWrongPass
	}
	// replace config.Host to env host.
	sealosHost := helper.GetKubernetesHostFromEnv()
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

func (a SealosAuthenticate) Stop() {
}

func NewSealosAuthn() SealosAuthenticate {
	return SealosAuthenticate{}
}
