package auth

import (
	"context"

	"github.com/cesanta/glog"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	"github.com/labring/service/hub/api"
)

func init() {
	glog.Info("authn plugin init function called")
}

type SealosAuthenticate struct {
	api.Authenticator
}

func (a SealosAuthenticate) Authenticate(user string, password api.PasswordString) (bool, api.Labels, error) {
	glog.Info("Authenticate for user:", user)
	// todo replace server ip to env $(SERVER)

	// create client
	client, err := kubernetes.NewKubernetesClientByConfigString(string(password))
	if err != nil {
		glog.Error("NewKubernetesClientByConfigString error")
		return false, api.Labels{}, api.ErrWrongPass
	}
	// check client by ping apiserver
	// or get organizations?
	res, err := client.Discovery().RESTClient().Get().AbsPath("/healthz").DoRaw(context.Background())
	if err != nil {
		glog.Error("Authenticate false, ping apiserver error")
		return false, api.Labels{}, api.ErrWrongPass
	}
	if string(res) != "ok" {
		glog.Error("Authenticate false, apiserver response not ok")
		return false, api.Labels{}, api.ErrWrongPass
	}
	glog.Info("Authenticate true")
	return true, api.Labels{}, nil
}

func (a SealosAuthenticate) Stop() {
}

func (a SealosAuthenticate) Name() string {
	return "authn.hub.sealos.io"
}

func NewSealosAuthn() SealosAuthenticate {
	return SealosAuthenticate{}
}
