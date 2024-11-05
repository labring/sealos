package dao

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/resources"
)

type ActiveBillingReq struct {
	resources.ActiveMonitor
}

func (a *ActiveBillingReq) Execute() error {
	return DBClient.ActiveMonitor(a.ActiveMonitor)
}

func ParseAdminActiveBillingReq(c *gin.Context) (*ActiveBillingReq, error) {
	activeBilling := &ActiveBillingReq{}
	if activeBilling.Time.IsZero() {
		activeBilling.Time = time.Now().UTC()
	}
	if err := c.ShouldBindJSON(activeBilling); err != nil {
		return nil, fmt.Errorf("bind json error: %v", err)
	}
	return activeBilling, nil
}
