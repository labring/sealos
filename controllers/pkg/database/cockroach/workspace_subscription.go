package cockroach

import (
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (c *Cockroach) GetWorkspaceSubscriptionPlan(
	planName string,
) (*types.WorkspaceSubscriptionPlan, error) {
	if planLoad, ok := c.workspaceSubPlans.Load(planName); ok {
		plan, ok := planLoad.(*types.WorkspaceSubscriptionPlan)
		if !ok {
			return nil, fmt.Errorf(
				"failed to assert subscription plan type from cache: %v",
				planLoad,
			)
		}
		return plan, nil
	}
	var plan types.WorkspaceSubscriptionPlan
	if c.Localdb.Migrator().HasTable(&types.WorkspaceSubscriptionPlan{}) {
		if err := c.Localdb.Preload("Prices").Where(types.WorkspaceSubscriptionPlan{Name: planName}).First(&plan).Error; err == nil {
			c.workspaceSubPlans.Store(planName, &plan)
			return &plan, nil
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("failed to get subscription plan from localdb: %w", err)
		}
	}
	if err := c.DB.Preload("Prices").Where(types.WorkspaceSubscriptionPlan{Name: planName}).First(&plan).Error; err != nil {
		return nil, fmt.Errorf("failed to get subscription plan: %w", err)
	}
	c.workspaceSubPlans.Store(planName, &plan)
	return &plan, nil
}

func (c *Cockroach) GetWorkspaceSubscription(
	workspace, regionDomain string,
) (*types.WorkspaceSubscription, error) {
	var subscription types.WorkspaceSubscription
	err := c.DB.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).
		First(&subscription).
		Error
	if err != nil {
		return nil, err
	}
	return &subscription, err
}

func (c *Cockroach) GetWorkspaceSubscriptionTraffic(
	workspace, regionDomain string,
) (total, used int64, err error) {
	result := &struct {
		Total int64 `gorm:"column:total"`
		Used  int64 `gorm:"column:used"`
	}{}
	err = c.DB.Model(&types.WorkspaceTraffic{}).
		Where("workspace = ? AND region_domain = ? AND expired_at > ?", workspace, regionDomain, time.Now()).
		Select("SUM(total_bytes) as total, SUM(used_bytes) as used").
		Scan(result).
		Error
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
	err = c.DB.Model(&types.WorkspaceAIQuotaPackage{}).
		Where("workspace = ? AND region_domain = ? AND status = ? AND expired_at > ?", workspace, regionDomain, types.PackageStatusActive, time.Now()).
		Select("SUM(total) as total, SUM(usage) as used").
		Scan(result).
		Error
	if err != nil {
		return 0, 0, err
	}
	return result.Total, result.Used, nil
}

// ListWorkspaceSubscription lists all subscriptions for a given user UID.
func (c *Cockroach) ListWorkspaceSubscription(
	userUID uuid.UUID,
) ([]types.WorkspaceSubscription, error) {
	var subscriptions []types.WorkspaceSubscription
	err := c.DB.Where("user_uid = ?", userUID).Find(&subscriptions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to list workspace subscriptions: %w", err)
	}
	return subscriptions, nil
}

func (c *Cockroach) GetAllUnprocessedWorkspaceSubscriptionTransaction(
	userUID uuid.UUID,
) ([]types.WorkspaceSubscriptionTransaction, error) {
	var transactions []types.WorkspaceSubscriptionTransaction
	err := c.DB.Where("user_uid = ? AND status IN (?, ?)", userUID, types.SubscriptionTransactionStatusPending, types.SubscriptionTransactionStatusProcessing).
		Find(&transactions).
		Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []types.WorkspaceSubscriptionTransaction{}, nil
		}
	}
	return transactions, nil
}

func (c *Cockroach) GetLastWorkspaceSubscriptionTransaction(
	workspace, regionDomain string,
) (*types.WorkspaceSubscriptionTransaction, error) {
	transaction := &types.WorkspaceSubscriptionTransaction{}
	err := c.DB.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).
		Order("created_at desc").
		First(transaction).
		Error
	if err != nil {
		return nil, err
	}
	return transaction, nil
}

// GetExpiredWorkspaceSubscriptions gets all expired workspace subscriptions with normal status and pay status
func (c *Cockroach) GetExpiredWorkspaceSubscriptions(
	regionDomain string,
) ([]types.WorkspaceSubscription, error) {
	var subscriptions []types.WorkspaceSubscription
	now := time.Now()

	err := c.DB.Where(`
		region_domain = ? AND 
		current_period_end_at <= ? AND 
		status = ? AND 
		pay_status IN (?, ?)
	`, regionDomain, now, types.SubscriptionStatusNormal, types.SubscriptionPayStatusPaid, types.SubscriptionPayStatusNoNeed).Find(&subscriptions).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get expired workspace subscriptions: %w", err)
	}
	return subscriptions, nil
}

func AddWorkspaceSubscriptionTrafficPackage(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	totalMiB int64,
	expireAt time.Time,
	from types.WorkspaceTrafficFrom,
	fromID string,
) error {
	_, err := AddWorkspaceSubscriptionTrafficPackageWithUpgrade(
		globalDB,
		subscriptionID,
		totalMiB,
		expireAt,
		from,
		fromID,
		false,
	)
	return err
}

// AddWorkspaceSubscriptionTrafficPackageWithUpgrade adds a traffic package with upgrade support.
// On upgrade the old plan's packages are expired and the new plan's full traffic is granted,
// so the workspace always holds the new plan's allowance for the reset billing cycle
// (labring/sealos-private#108).
//
// It reports whether a package carrying usable traffic was inserted; see
// grantSubscriptionPackage.
func AddWorkspaceSubscriptionTrafficPackageWithUpgrade(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	totalMiB int64,
	expireAt time.Time,
	from types.WorkspaceTrafficFrom,
	fromID string,
	isUpgrade bool,
) (bool, error) {
	return grantSubscriptionPackage(
		globalDB,
		subscriptionID,
		totalMiB,
		expireAt,
		fromID,
		isUpgrade,
		packageGrantSpec{
			name:          "traffic",
			model:         &types.WorkspaceTraffic{},
			expiredStatus: types.WorkspaceTrafficStatusExpired,
			planFrom:      types.WorkspaceTrafficFromWorkspaceSubscription,
			newRow: func(
				sub types.WorkspaceSubscription,
				totalMiB int64,
				expired bool,
				expireAt time.Time,
			) any {
				status := types.WorkspaceTrafficStatusActive
				if expired {
					status = types.WorkspaceTrafficStatusExpired
				}
				now := time.Now()
				return &types.WorkspaceTraffic{
					ID:                      uuid.New(),
					WorkspaceSubscriptionID: subscriptionID,
					Workspace:               sub.Workspace,
					RegionDomain:            sub.RegionDomain,
					From:                    from,
					FromID:                  fromID,
					TotalBytes:              totalMiB * 1024 * 1024, // Convert MiB to Bytes
					ExpiredAt:               expireAt,
					Status:                  status,
					CreatedAt:               now,
					UpdatedAt:               now,
				}
			},
		},
	)
}

func AddWorkspaceSubscriptionAIQuotaPackage(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	aiQuota int64,
	expireAt time.Time,
	from types.PackageFrom,
	fromID string,
) error {
	return AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade(
		globalDB,
		subscriptionID,
		aiQuota,
		expireAt,
		from,
		fromID,
		false,
	)
}

// AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade adds an AI quota package with
// upgrade support; see AddWorkspaceSubscriptionTrafficPackageWithUpgrade for the
// upgrade semantics. AI quota has no side effect gated on a fresh grant, so the
// caller is not told whether one happened.
func AddWorkspaceSubscriptionAIQuotaPackageWithUpgrade(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	aiQuota int64,
	expireAt time.Time,
	from types.PackageFrom,
	fromID string,
	isUpgrade bool,
) error {
	_, err := grantSubscriptionPackage(
		globalDB,
		subscriptionID,
		aiQuota,
		expireAt,
		fromID,
		isUpgrade,
		packageGrantSpec{
			name:          "AI quota",
			model:         &types.WorkspaceAIQuotaPackage{},
			expiredStatus: types.PackageStatusExpired,
			planFrom:      types.PKGFromWorkspaceSubscription,
			newRow: func(
				sub types.WorkspaceSubscription,
				aiQuota int64,
				expired bool,
				expireAt time.Time,
			) any {
				status := types.PackageStatusActive
				if expired {
					status = types.PackageStatusExpired
				}
				now := time.Now()
				return &types.WorkspaceAIQuotaPackage{
					ID:                      uuid.New(),
					WorkspaceSubscriptionID: subscriptionID,
					Workspace:               sub.Workspace,
					RegionDomain:            sub.RegionDomain,
					From:                    from,
					FromID:                  fromID,
					Total:                   aiQuota,
					Status:                  status,
					ExpiredAt:               expireAt,
					CreatedAt:               now,
					UpdatedAt:               now,
				}
			},
		},
	)
	return err
}

// packageGrantSpec describes one subscription-package table. The traffic and AI
// quota grants run the same algorithm and differ only in the row type, the
// expired status, and the "from" value that marks a plan-granted package.
type packageGrantSpec struct {
	// name labels the package in error messages.
	name string
	// model is an empty row of the package type, used to scope queries.
	model any
	// expiredStatus is the table's terminal status constant.
	expiredStatus any
	// planFrom marks plan-granted packages, the only ones an upgrade rotates.
	planFrom any
	// newRow builds the row to insert. total is the caller's allowance in the
	// table's own unit; expired marks a zero-allowance marker row.
	newRow func(sub types.WorkspaceSubscription, total int64, expired bool, expireAt time.Time) any
}

// grantSubscriptionPackage locks the subscription, dedups on fromID, rotates the
// old plan's packages on upgrade, and inserts the new package row.
//
// The lock serializes concurrent grants for the same subscription (e.g. replayed
// Stripe webhooks): the second transaction blocks until the first commits, so its
// dedup check sees the created row and its expiry query sees the rotated packages.
// Callers must run inside a transaction for the lock to be effective.
//
// It reports whether a package carrying a usable allowance was inserted, which is
// false both for a replay and for a zero-allowance upgrade.
func grantSubscriptionPackage(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	total int64,
	expireAt time.Time,
	fromID string,
	isUpgrade bool,
	spec packageGrantSpec,
) (bool, error) {
	var subscription types.WorkspaceSubscription
	err := globalDB.Clauses(clause.Locking{Strength: "UPDATE"}).
		Where(&types.WorkspaceSubscription{ID: subscriptionID}).
		Find(&subscription).
		Error
	if err != nil {
		return false, fmt.Errorf("failed to get workspace subscription: %w", err)
	}
	// Dedup on from_id before expiry. A later replay of an older transaction
	// (A, then B, then replay A) must not expire B's package.
	var existingCount int64
	err = globalDB.Model(spec.model).
		Where("from_id = ?", fromID).
		Count(&existingCount).Error
	if err != nil {
		return false, fmt.Errorf("failed to check existing %s package: %w", spec.name, err)
	}
	if existingCount > 0 {
		return false, nil
	}

	// Expire before the allowance guard below: an upgrade must retire the old
	// plan's packages even when the new plan grants nothing.
	if isUpgrade {
		if err := expireOldPlanPackages(globalDB, subscriptionID, fromID, spec); err != nil {
			return false, fmt.Errorf("failed to expire old %s packages: %w", spec.name, err)
		}
	}

	// A zero-allowance upgrade still writes an expired marker. The marker keeps
	// from_id durable, so replaying this transaction cannot expire a package
	// granted by a later transaction.
	expired := false
	if total <= 0 {
		if !isUpgrade {
			return false, nil
		}
		total, expired, expireAt = 0, true, time.Now()
	}
	// ON CONFLICT DO NOTHING backstops the dedup where the from_id unique
	// index exists; it is a no-op (and still valid SQL) on tables that
	// predate the index, where the subscription row lock alone serializes.
	result := globalDB.Clauses(clause.OnConflict{DoNothing: true}).
		Create(spec.newRow(subscription, total, expired, expireAt))
	if result.Error != nil {
		return false, fmt.Errorf("failed to create %s package: %w", spec.name, result.Error)
	}
	return !expired && result.RowsAffected > 0, nil
}

// expireOldPlanPackages retires the packages the old plan granted. Packages from
// other sources (purchased or promotional) must survive, and excluding newFromID
// keeps a replayed transaction from expiring the package it created.
func expireOldPlanPackages(
	globalDB *gorm.DB,
	subscriptionID uuid.UUID,
	newFromID string,
	spec packageGrantSpec,
) error {
	now := time.Now()
	return globalDB.Model(spec.model).
		Where(`workspace_subscription_id = ? AND status <> ? AND "from" = ? AND from_id IS DISTINCT FROM ?`,
			subscriptionID, spec.expiredStatus, spec.planFrom, newFromID).
		Updates(map[string]any{
			"status":     spec.expiredStatus,
			"expired_at": now,
			"updated_at": now,
		}).Error
}

func (c *Cockroach) SetWorkspaceSubscriptionPlanList(
	plans ...*types.WorkspaceSubscriptionPlan,
) error {
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
		return nil, fmt.Errorf("failed to get subscription plan list: %w", err)
	}
	return plans, nil
}
