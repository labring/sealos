package cockroach

import (
	"errors"
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
	if c.Localdb.Migrator().HasTable(&types.WorkspaceSubscriptionPlan{}) {
		if err := c.Localdb.Preload("Prices").Where(types.WorkspaceSubscriptionPlan{Name: planName}).First(&plan).Error; err == nil {
			c.workspaceSubPlans.Store(planName, &plan)
			return &plan, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to get subscription plan from localdb: %v", err)
		}
	}
	if err := c.DB.Preload("Prices").Where(types.WorkspaceSubscriptionPlan{Name: planName}).First(&plan).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %v", err)
	}
	c.workspaceSubPlans.Store(planName, &plan)
	return &plan, nil
}

func (c *Cockroach) GetWorkspaceSubscription(workspace, regionDomain string) (*types.WorkspaceSubscription, error) {
	var subscription types.WorkspaceSubscription
	err := c.DB.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).First(&subscription).Error
	if err != nil {
		return nil, err
	}
	return &subscription, err
}

func (c *Cockroach) GetWorkspaceSubscriptionTraffic(workspace, regionDomain string) (total, used int64, err error) {
	result := &struct {
		Total int64 `gorm:"column:total"`
		Used  int64 `gorm:"column:used"`
	}{}
	err = c.DB.Model(&types.WorkspaceTraffic{}).Where("workspace = ? AND region_domain = ? AND expired_at > ?", workspace, regionDomain, time.Now()).
		Select("SUM(total_bytes) as total, SUM(used_bytes) as used").Scan(result).Error
	if err != nil {
		return 0, 0, err
	}
	return result.Total, result.Used, nil
}

func (c *Cockroach) GetAIQuota(workspace, regionDomain string) (total, used int64, err error) {
	result := &struct {
		Total int64 `gorm:"column:total"`
		Used  int64 `gorm:"column:used"`
	}{}
	err = c.DB.Model(&types.WorkspaceAIQuotaPackage{}).Where("workspace = ? AND region_domain = ? AND status = ? AND expired_at > ?", workspace, regionDomain, types.PackageStatusActive, time.Now()).
		Select("SUM(total) as total, SUM(usage) as used").Scan(result).Error
	if err != nil {
		return 0, 0, err
	}
	return result.Total, result.Used, nil
}

// ListWorkspaceSubscription lists all subscriptions for a given user UID.
func (c *Cockroach) ListWorkspaceSubscription(userUID uuid.UUID) ([]types.WorkspaceSubscription, error) {
	var subscriptions []types.WorkspaceSubscription
	err := c.DB.Where("user_uid = ?", userUID).Find(&subscriptions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list workspace subscriptions: %v", err)
	}
	return subscriptions, nil
}

func (c *Cockroach) GetAllUnprocessedWorkspaceSubscriptionTransaction(userUid uuid.UUID) ([]types.WorkspaceSubscriptionTransaction, error) {
	var transactions []types.WorkspaceSubscriptionTransaction
	err := c.DB.Where("user_uid = ? AND status IN (?, ?)", userUid, types.SubscriptionTransactionStatusPending, types.SubscriptionTransactionStatusProcessing).Find(&transactions).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []types.WorkspaceSubscriptionTransaction{}, nil
		}
	}
	return transactions, nil
}

func (c *Cockroach) GetLastWorkspaceSubscriptionTransaction(workspace, regionDomain string) (*types.WorkspaceSubscriptionTransaction, error) {
	transaction := &types.WorkspaceSubscriptionTransaction{}
	err := c.DB.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).Order("created_at desc").First(transaction).Error
	if err != nil {
		return nil, err
	}
	return transaction, nil
}

// GetExpiredWorkspaceSubscriptions gets all expired workspace subscriptions with normal status and pay status
func (c *Cockroach) GetExpiredWorkspaceSubscriptions(regionDomain string) ([]types.WorkspaceSubscription, error) {
	var subscriptions []types.WorkspaceSubscription
	now := time.Now()

	err := c.DB.Where(`
		region_domain = ? AND 
		current_period_end_at <= ? AND 
		status = ? AND 
		pay_status IN (?, ?)
	`, regionDomain, now, types.SubscriptionStatusNormal, types.SubscriptionPayStatusPaid, types.SubscriptionPayStatusNoNeed).Find(&subscriptions).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get expired workspace subscriptions: %v", err)
	}
	return subscriptions, nil
}

func AddWorkspaceSubscriptionTrafficPackage(globalDB *gorm.DB, subscriptionID uuid.UUID, totalMiB int64, expireAt time.Time, from types.WorkspaceTrafficFrom, fromID string) error {
	totalBytes := totalMiB * 1024 * 1024 // Convert MiB to Bytes
	// Get workspace subscription
	var subscription types.WorkspaceSubscription
	err := globalDB.Where(&types.WorkspaceSubscription{ID: subscriptionID}).Find(&subscription).Error
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

func AddWorkspaceSubscriptionAIQuotaPackage(globalDB *gorm.DB, subscriptionID uuid.UUID, aiQuota int64, expireAt time.Time, from types.PackageFrom, fromID string) error {
	if aiQuota <= 0 {
		return nil
	}
	// Get workspace subscription
	var subscription types.WorkspaceSubscription
	err := globalDB.Where(&types.WorkspaceSubscription{ID: subscriptionID}).Find(&subscription).Error
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription: %v", err)
	}
	// Create new AI quota package
	aiQuotaPackage := types.WorkspaceAIQuotaPackage{
		ID:                      uuid.New(),
		WorkspaceSubscriptionID: subscriptionID,
		Workspace:               subscription.Workspace,
		RegionDomain:            subscription.RegionDomain,
		From:                    from,
		FromID:                  fromID,
		Total:                   aiQuota,
		Usage:                   0,
		Status:                  types.PackageStatusActive,
		ExpiredAt:               expireAt,
		CreatedAt:               time.Now(),
		UpdatedAt:               time.Now(),
	}
	err = globalDB.Where("from_id = ?", fromID).FirstOrCreate(&aiQuotaPackage).Error
	if err != nil {
		return fmt.Errorf("failed to create AI quota package: %v", err)
	}
	return nil
}

func (c *Cockroach) SetWorkspaceSubscriptionPlanList(plans ...*types.WorkspaceSubscriptionPlan) error {
	return c.DB.Transaction(func(tx *gorm.DB) error {
		for _, plan := range plans {
			planWithoutPrices := *plan
			planWithoutPrices.Prices = nil // temporarily remove the association
			if err := tx.Save(&planWithoutPrices).Error; err != nil {
				return fmt.Errorf("failed to save WorkspaceSubscriptionPlan %s: %w", plan.Name, err)
			}

			if plan.ID == uuid.Nil {
				return fmt.Errorf("WorkspaceSubscriptionPlan %s has no valid ID", plan.Name)
			}

			// save the associated prices again
			for i := range plan.Prices {
				plan.Prices[i].ProductID = plan.ID // make sure the foreign keys are correct
				if err := tx.Save(&plan.Prices[i]).Error; err != nil {
					return fmt.Errorf("failed to save ProductPrice for plan %s: %w", plan.Name, err)
				}
			}
		}
		return nil
	})
}

func (c *Cockroach) GetWorkspaceSubscriptionPlanList() ([]types.WorkspaceSubscriptionPlan, error) {
	var plans []types.WorkspaceSubscriptionPlan
	if err := c.DB.Preload("Prices").Find(&plans).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan list: %v", err)
	}
	return plans, nil
}
