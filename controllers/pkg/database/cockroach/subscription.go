package cockroach

import (
	"fmt"

	"github.com/labring/sealos/controllers/pkg/types"
)

func (c *Cockroach) GetWorkspaceSubscriptionPlan(planName string) (*types.WorkspaceSubscriptionPlan, error) {
	if planLoad, ok := c.workspaceSubPlans.Load(planName); ok {
		return planLoad.(*types.WorkspaceSubscriptionPlan), nil
	}
	var plan types.WorkspaceSubscriptionPlan
	if err := c.DB.Where(types.WorkspaceSubscriptionPlan{Name: planName}).Find(&plan).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %v", err)
	}
	c.workspaceSubPlans.Store(planName, &plan)
	return &plan, nil
}

func (c *Cockroach) GetWorkspaceSubscriptionPlanList() ([]types.WorkspaceSubscriptionPlan, error) {
	var plans []types.WorkspaceSubscriptionPlan
	if err := c.DB.Find(&plans).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan list: %v", err)
	}
	return plans, nil
}
