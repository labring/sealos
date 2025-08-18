package cockroach

import (
	"fmt"
	"time"

	"gorm.io/gorm"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/pkg/types"
)

func (c *Cockroach) GetWorkspaceSubscriptionPlan(planName string) (*types.WorkspaceSubscriptionPlan, error) {
	if planLoad, ok := c.workspaceSubPlans.Load(planName); ok {
		return planLoad.(*types.WorkspaceSubscriptionPlan), nil
	}
	var plan types.WorkspaceSubscriptionPlan
	if err := c.DB.Where(types.WorkspaceSubscriptionPlan{Name: planName}).First(&plan).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %v", err)
	}
	c.workspaceSubPlans.Store(planName, &plan)
	return &plan, nil
}

func AddWorkspaceSubscriptionTrafficPackage(globalDB *gorm.DB, subscriptionID uuid.UUID, totalMiB int64, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	totalBytes := totalMiB * 1024 * 1024 // Convert MiB to Bytes
	// Get workspace subscription
	var subscription types.WorkspaceSubscription
	err := globalDB.First(&subscription, "id = ?", subscriptionID).Error
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription: %v", err)
	}
	// Create new traffic package
	trafficPackage := types.WorkspaceTraffic{
		ID:                      uuid.New(),
		WorkspaceSubscriptionID: subscriptionID,
		Workspace:               subscription.Workspace,
		RegionDomain:            subscription.RegionDomain,
		From:                    from,
		FromID:                  fromID,
		TotalBytes:              totalBytes,
		UsedBytes:               0,
		ExpiredAt:               expireAt,
		Status:                  types.WorkspaceTrafficStatusActive,
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
	}
	err = globalDB.Where("workspace_subscription_id = ?", subscriptionID).FirstOrCreate(&trafficPackage).Error
	if err != nil {
		return fmt.Errorf("failed to create traffic package: %v", err)
	}
	return nil
}

func (c *Cockroach) SetWorkspaceSubscriptionPlanList(plans ...*types.WorkspaceSubscriptionPlan) error {
	for _, plan := range plans {
		if err := c.DB.Save(plan).Error; err != nil {
			return fmt.Errorf("failed to set subscription plan: %v", err)
		}
		c.workspaceSubPlans.Store(plan.Name, plan)
	}
	return nil
}

func (c *Cockroach) GetWorkspaceSubscriptionPlanList() ([]types.WorkspaceSubscriptionPlan, error) {
	var plans []types.WorkspaceSubscriptionPlan
	if err := c.DB.Find(&plans).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan list: %v", err)
	}
	return plans, nil
}
