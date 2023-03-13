package svc

import (
	"github.com/labring/sealos/controllers/imagehub/api-service/internal/config"
	"github.com/labring/sealos/pkg/client-go/kubernetes"
	ctrl "sigs.k8s.io/controller-runtime"
)

type ServiceContext struct {
	Config    config.Config
	K8sClient kubernetes.Client
}

func NewServiceContext(c config.Config) (*ServiceContext, error) {
	k8sClient, err := kubernetes.NewKubernetesClientByConfig(ctrl.GetConfigOrDie())
	if err != nil {
		return nil, err
	}
	return &ServiceContext{
		Config:    c,
		K8sClient: k8sClient,
	}, nil
}
