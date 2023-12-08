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
	if auth.KubeConfig == "" || auth.Owner == "" {
		return fmt.Errorf("kubeconfig and owner must be set")
	}
	userNamespace := auth.Owner
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
