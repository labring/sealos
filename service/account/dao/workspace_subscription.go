package dao

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

// WorkspaceSubscription methods implementation
func (g *Cockroach) GetWorkspaceSubscription(workspace, regionDomain string) (*types.WorkspaceSubscription, error) {
	return g.ck.GetWorkspaceSubscription(workspace, regionDomain)
}

func (g *Cockroach) GetWorkspaceSubscriptionPaymentAmount(userUID uuid.UUID, workspace string) (int64, error) {
	db := g.ck.GetGlobalDB()
	query := `"user_uid" = ? AND pay_status = ?`
	params := []interface{}{userUID, types.SubscriptionPayStatusPaid}
	if workspace != "" {
		query += " AND workspace = ?"
		params = append(params, workspace)
	}

	var totalAmount int64
	err := db.Model(&types.WorkspaceSubscriptionTransaction{}).
		Where(query, params...).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&totalAmount).Error
	if err != nil {
		return 0, fmt.Errorf("failed to get subscription payment amount: %w", err)
	}
	return totalAmount, nil
}

func (g *Cockroach) ListWorkspaceSubscriptionWorkspace(userUID uuid.UUID) ([]string, error) {
	db := g.ck.GetGlobalDB()
	var workspaces []string
	err := db.Model(&types.WorkspaceSubscriptionTransaction{}).Debug().
		Where("user_uid = ? AND region_domain = ? AND pay_status = ?", userUID, g.GetLocalRegion().Domain, types.SubscriptionPayStatusPaid).
		Distinct("workspace").
		Pluck("workspace", &workspaces).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []string{}, nil
		}
		return nil, fmt.Errorf("failed to list subscription workspaces: %w", err)
	}
	return workspaces, nil
}

func (g *Cockroach) GetWorkspaceSubscriptionTraffic(workspace, regionDomain string) (total, used int64, err error) {
	return g.ck.GetWorkspaceSubscriptionTraffic(workspace, regionDomain)
}

func (g *Cockroach) ListWorkspaceSubscription(userUID uuid.UUID) ([]types.WorkspaceSubscription, error) {
	return g.ck.ListWorkspaceSubscription(userUID)
}

func (g *Cockroach) GetWorkspaceSubscriptionPlanList() ([]types.WorkspaceSubscriptionPlan, error) {
	return g.ck.GetWorkspaceSubscriptionPlanList()
}

func (g *Cockroach) GetWorkspaceSubscriptionPlan(planName string) (*types.WorkspaceSubscriptionPlan, error) {
	return g.ck.GetWorkspaceSubscriptionPlan(planName)
}

func (g *Cockroach) GetWorkspaceSubscriptionPlanPrice(planName string, period types.SubscriptionPeriod) (*types.ProductPrice, error) {
	plan, err := g.ck.GetWorkspaceSubscriptionPlan(planName)
	if err != nil {
		return nil, err
	}
	for i := range plan.Prices {
		if plan.Prices[i].BillingCycle == period {
			return &plan.Prices[i], nil
		}
	}
	return nil, errors.New(fmt.Sprintf("no such subscription plan %s", planName))
}

func (g *Cockroach) GetLastWorkspaceSubscriptionTransaction(workspace, regionDomain string) (*types.WorkspaceSubscriptionTransaction, error) {
	return g.ck.GetLastWorkspaceSubscriptionTransaction(workspace, regionDomain)
}

func AddWorkspaceSubscriptionTrafficPackage(globalDB *gorm.DB, subscriptionID uuid.UUID, totalMiB int64, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	return cockroach.AddWorkspaceSubscriptionTrafficPackage(globalDB, subscriptionID, totalMiB, expireAt, from, fromID)
}

func (g *Cockroach) CreateWorkspaceSubscriptionTransaction(tx *gorm.DB, transactions ...*types.WorkspaceSubscriptionTransaction) error {
	for i := range transactions {
		err := tx.Create(transactions[i]).Error
		if err != nil {
			return err
		}
	}
	return nil
}
