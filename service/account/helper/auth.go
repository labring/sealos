package helper

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/utils/logger"

	auth2 "github.com/labring/sealos/service/pkg/auth"
)

func AuthenticateWithBind(c *gin.Context) error {
	auth := &Auth{}
	err := c.ShouldBindJSON(auth)
	if err != nil {
		return fmt.Errorf("bind json error : %v", err)
	}
	return Authenticate(*auth)
}

func Authenticate(auth Auth) error {
	if auth.KubeConfig == "" {
		return fmt.Errorf("kubeconfig must be set")
	}
	kcConfig, err := auth2.GetKcConfig(auth.KubeConfig)
	if err != nil {
		return fmt.Errorf("kubeconfig failed  %v", err)
	}
	if err := auth2.CheckK8sHost(kcConfig.Host); err != nil {
		return fmt.Errorf("failed to check k8s host: %v", err)
	}
	auth.Owner = kcConfig.Username
	userNamespace := kcConfig.Username
	if !strings.HasPrefix(userNamespace, "ns-") {
		userNamespace = "ns-" + userNamespace
	}
	// Identity authentication
	if err := auth2.Authenticate(userNamespace, auth.KubeConfig); err != nil {
		logger.Error("failed to auth %s: %v", userNamespace, err)
		return fmt.Errorf("authentication failure")
	}
	return nil
}
