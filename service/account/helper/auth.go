package helper

import (
	"errors"
	"fmt"

	"github.com/labring/sealos/controllers/pkg/utils/logger"
	auth2 "github.com/labring/sealos/service/pkg/auth"
)

func AuthenticateKC(auth Auth) error {
	if auth.KubeConfig == "" {
		return errors.New("kubeconfig must be set")
	}
	host, err := auth2.GetKcHost(auth.KubeConfig)
	if err != nil {
		return fmt.Errorf("kubeconfig failed  %w", err)
	}
	if err := auth2.CheckK8sHost(host); err != nil {
		return fmt.Errorf("failed to check k8s host: %w", err)
	}

	user, err := auth2.GetKcUser(auth.KubeConfig)
	if err != nil {
		return fmt.Errorf("failed to get user: %w", err)
	}

	userNamespace := "ns-" + user
	// Identity authentication
	if err := auth2.Authenticate(userNamespace, auth.KubeConfig); err != nil {
		logger.Error("failed to auth %s: %v", userNamespace, err)
		return errors.New("authentication failure")
	}
	return nil
}
