package dao

import (
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/resources"
)

type ActiveBillingReq struct {
	resources.ActiveBilling
}

func (a *ActiveBillingReq) Execute() error {
	return DBClient.ActiveBilling(a.ActiveBilling)
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

type ActiveBillingReconcile struct {
	StartTime, EndTime time.Time
}

func (a *ActiveBillingReconcile) Execute() error {
	if err := DBClient.ReconcileActiveBilling(a.StartTime, a.EndTime); err != nil {
		return fmt.Errorf("reconcile active billing error: %v", err)
	}
	return nil
}

type ArchiveBillingReconcile struct {
	StartTime time.Time
}

func (a *ArchiveBillingReconcile) Execute() error {
	if err := DBClient.ArchiveHourlyBilling(a.StartTime, a.StartTime.Add(time.Hour)); err != nil {
		return fmt.Errorf("archive hourly billing error: %v", err)
	}
	return nil
}
