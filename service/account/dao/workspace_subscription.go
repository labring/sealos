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
	err := db.Model(&types.WorkspaceSubscription{}).
		Where("user_uid = ? AND region_domain = ?", userUID, g.GetLocalRegion().Domain).
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

func (g *Cockroach) GetAIQuota(workspace, regionDomain string) (total, used int64, err error) {
	return g.ck.GetAIQuota(workspace, regionDomain)
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

func (g *Cockroach) GetAllUnprocessedWorkspaceSubscriptionTransaction(userUid uuid.UUID) ([]types.WorkspaceSubscriptionTransaction, error) {
	return g.ck.GetAllUnprocessedWorkspaceSubscriptionTransaction(userUid)
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

/*
	type WorkspaceSubscription struct {
	    ID                   uuid.UUID              `gorm:"type:uuid;default:gen_random_uuid();primaryKey;column:id"`
	    PlanName             string                 `gorm:"type:varchar(50);column:plan_name"`
	    Workspace            string                 `gorm:"type:varchar(50);column:workspace;uniqueIndex:idx_workspace_region_domain"`
	    RegionDomain         string                 `gorm:"type:varchar(50);column:region_domain;uniqueIndex:idx_workspace_region_domain"`
	    UserUID              uuid.UUID              `gorm:"type:uuid;index:idx_workspace_subscription_user_uid;column:user_uid"`
	    Status               SubscriptionStatus     `gorm:"type:subscription_status;column:status"`
	    PayStatus            SubscriptionPayStatus  `gorm:"type:subscription_pay_status;column:pay_status"`
	    PayMethod            PaymentMethod          `gorm:"type:string;column:pay_method"`
	    Stripe               *StripePay             `gorm:"column:stripe;type:json"`
	    TrafficStatus        WorkspaceTrafficStatus `gorm:"type:workspace_traffic_status;default:'active';column:traffic_status"`
	    CurrentPeriodStartAt time.Time              `gorm:"column:current_period_start_at"`
	    CurrentPeriodEndAt   time.Time              `gorm:"column:current_period_end_at"`
	    CancelAtPeriodEnd    bool                   `gorm:"column:cancel_at_period_end;default:false"`
	    CancelAt             time.Time              `gorm:"column:cancel_at"`
	    CreateAt             time.Time              `gorm:"column:create_at"`
	    UpdateAt             time.Time              `gorm:"column:update_at;autoCreateTime"`
	    ExpireAt             *time.Time             `gorm:"column:expire_at"`
	    Traffic              []WorkspaceTraffic     `gorm:"foreignKey:WorkspaceSubscriptionID;references:ID"`
	}
*/
func (g *Cockroach) GetUserStripeCustomerID(userUID uuid.UUID) (string, error) {
	var customerID string
	err := g.ck.GetGlobalDB().Debug().Model(&types.Payment{}).
		Where(`"userUid" = ? AND stripe IS NOT NULL`, userUID).
		Select("COALESCE(stripe->>'customerId', '')").
		Order("created_at DESC").
		Limit(1).
		Scan(&customerID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", fmt.Errorf("failed to get user stripe customer ID: %w", err)
	}
	return customerID, nil
}
