package controllers

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils/retry"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SubscriptionProcessor 处理订阅事务的处理器
type SubscriptionProcessor struct {
	db           *gorm.DB
	pollInterval time.Duration
	wg           sync.WaitGroup
	stopChan     chan struct{}
	*AccountReconciler
}

// NewSubscriptionProcessor 创建新的处理器实例
func NewSubscriptionProcessor(reconciler *AccountReconciler) *SubscriptionProcessor {
	return &SubscriptionProcessor{
		db:                reconciler.AccountV2.GetGlobalDB(),
		pollInterval:      time.Minute, // 使用常量简化
		stopChan:          make(chan struct{}),
		AccountReconciler: reconciler,
	}
}

// Start 开始监听和处理订阅事务
func (sp *SubscriptionProcessor) Start(ctx context.Context) error {
	sp.wg.Add(1)
	go func() {
		defer sp.wg.Done()
		ticker := time.NewTicker(sp.pollInterval)
		defer ticker.Stop()

		for {
			select {
			case <-ctx.Done():
				return
			case <-sp.stopChan:
				return
			case <-ticker.C:
				if err := sp.processPendingTransactions(ctx); err != nil {
					log.Printf("Failed to process pending transactions: %v", err)
				}
			}
		}
	}()
	return nil
}

// Stop 停止处理器
func (sp *SubscriptionProcessor) Stop() {
	close(sp.stopChan)
	sp.wg.Wait()
}

// processPendingTransactions 处理待处理的事务
func (sp *SubscriptionProcessor) processPendingTransactions(ctx context.Context) error {
	var transactions []types.SubscriptionTransaction
	now := time.Now()

	// 查询待处理事务并加锁
	err := sp.db.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("pay_status = ? AND start_at <= ? AND status NOT IN (?, ?)",
			types.SubscriptionPayStatusPaid,
			now,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionStatusFailed).
		Find(&transactions).Error
	if err != nil {
		return fmt.Errorf("failed to query pending transactions: %w", err)
	}

	for i := range transactions {
		sp.AccountReconciler.Logger.Info("Processing transaction", "id", transactions[i].SubscriptionID, "operator", transactions[i].Operator, "status", transactions[i].Status, "plan", transactions[i].NewPlanName)
		if err := sp.processTransaction(ctx, &transactions[i]); err != nil {
			sp.Logger.Error(fmt.Errorf("failed to process transaction: %w", err), "", "id", transactions[i].ID)
		}
	}
	return nil
}

// processTransaction 处理单个事务
func (sp *SubscriptionProcessor) processTransaction(ctx context.Context, tx *types.SubscriptionTransaction) error {
	return sp.db.Transaction(func(dbTx *gorm.DB) error {
		//var latestTx types.SubscriptionTransaction
		//if err := dbTx.Clauses(clause.Locking{Strength: "UPDATE"}).
		//	Find(&latestTx, "subscription_id = ?", tx.SubscriptionID).Error; err != nil {
		//	return fmt.Errorf("failed to lock transaction %s: %w", tx.SubscriptionID, err)
		//}
		latestTx := *tx
		// 检查是否仍需处理
		if !sp.shouldProcessTransaction(&latestTx) {
			sp.Logger.Info("Transaction needn't processed", "id", latestTx.ID)
			return nil
		}

		// 根据操作类型分发处理
		handler, exists := map[types.SubscriptionOperator]func(context.Context, *gorm.DB, *types.SubscriptionTransaction) error{
			types.SubscriptionTransactionTypeCreated:    sp.handleCreated,
			types.SubscriptionTransactionTypeUpgraded:   sp.handleUpgrade,
			types.SubscriptionTransactionTypeDowngraded: sp.handleDowngrade,
			types.SubscriptionTransactionTypeRenewed:    sp.handleRenewal,
		}[latestTx.Operator]
		if !exists {
			sp.Logger.Info("Unknown operator", "operator", latestTx.Operator)
			return nil // 未知操作类型，跳过
		}

		return handler(ctx, dbTx, &latestTx)
	})
}

// shouldProcessTransaction 检查事务是否需要处理
func (sp *SubscriptionProcessor) shouldProcessTransaction(tx *types.SubscriptionTransaction) bool {
	now := time.Now()
	return (tx.PayStatus == types.SubscriptionPayStatusPaid || tx.PayStatus == types.SubscriptionPayStatusNoNeed) &&
		!tx.StartAt.After(now) &&
		tx.Status != types.SubscriptionTransactionStatusCompleted &&
		tx.Status != types.SubscriptionTransactionStatusFailed
}

// updateQuota 更新用户的资源配额
func (sp *SubscriptionProcessor) updateQuota(ctx context.Context, userUID uuid.UUID, planName string) error {
	userCr, err := sp.AccountV2.GetUserCr(&types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get user CR: %w", err)
	}
	nsList, err := getOwnNsList(sp.Client, userCr.CrName)
	if err != nil {
		return fmt.Errorf("failed to get namespace list: %w", err)
	}
	subQuota, ok := sp.SubscriptionQuotaLimit[planName]
	if !ok {
		return fmt.Errorf("subscription plan %s not found", planName)
	}

	for _, ns := range nsList {
		quota := getDefaultResourceQuota(ns, ResourceQuotaPrefix+ns, subQuota)
		err = retry.Retry(10, time.Second, func() error {
			return sp.Client.Update(ctx, quota)
		})
		if err != nil {
			return fmt.Errorf("failed to update resource quota for %s: %w", ns, err)
		}
	}
	return nil
}

// handleCreated 处理创建订阅
func (sp *SubscriptionProcessor) handleCreated(ctx context.Context, dbTx *gorm.DB, tx *types.SubscriptionTransaction) error {
	var sub types.Subscription
	if err := dbTx.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: tx.UserUID, ID: tx.SubscriptionID}).Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch subscription: %w", err)
	}

	now := time.Now().UTC()
	sub.PlanID = tx.NewPlanID
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// 更新配额
	if err := sp.updateQuota(ctx, sub.UserUID, tx.NewPlanName); err != nil {
		return fmt.Errorf("failed to update quota: %w", err)
	}

	// 创建积分
	plan, err := sp.AccountV2.GetSubscriptionPlan(tx.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}
	if err := cockroach.CreateCredits(dbTx, &types.Credits{
		UserUID:   sub.UserUID,
		Amount:    plan.GiftAmount,
		FromID:    sub.ID.String(),
		FromType:  types.CreditsFromTypeSubscription,
		ExpireAt:  sub.ExpireAt,
		CreatedAt: now,
		StartAt:   now,
		Status:    types.CreditsStatusActive,
	}); err != nil {
		return fmt.Errorf("failed to create credits: %w", err)
	}
	//TODO create Credits Transaction

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	return dbTx.Save(tx).Error
}

// handleUpgrade 处理升级
func (sp *SubscriptionProcessor) handleUpgrade(ctx context.Context, dbTx *gorm.DB, tx *types.SubscriptionTransaction) error {
	var sub types.Subscription
	if err := dbTx.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: tx.UserUID, ID: tx.SubscriptionID}).Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch subscription: %w", err)
	}
	// 更新订阅信息
	sub.PlanID = tx.NewPlanID
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// 更新配额
	if err := sp.updateQuota(ctx, sub.UserUID, tx.NewPlanName); err != nil {
		return err
	}

	// 更新积分
	var credits types.Credits
	err := dbTx.Where(&types.Credits{
		UserUID:  sub.UserUID,
		FromType: types.CreditsFromTypeSubscription,
	}).Where("expire_at > ?", time.Now()).Order("created_at desc").First(&credits).Error
	if err != nil {
		return fmt.Errorf("failed to fetch latest credits: %w", err)
	}
	plan, err := sp.AccountV2.GetSubscriptionPlan(tx.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}
	credits.Amount = plan.GiftAmount
	credits.Status = types.CreditsStatusActive
	if err := dbTx.Save(&credits).Error; err != nil {
		return fmt.Errorf("failed to update credits: %w", err)
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = time.Now().UTC()
	return dbTx.Save(tx).Error
}

// handleDowngrade 处理降级
func (sp *SubscriptionProcessor) handleDowngrade(ctx context.Context, dbTx *gorm.DB, tx *types.SubscriptionTransaction) error {
	var sub types.Subscription
	if err := dbTx.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: tx.UserUID, ID: tx.SubscriptionID}).Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch subscription: %w", err)
	}

	if !sp.checkDowngradeConditions(ctx, &sub, tx.NewPlanID) {
		tx.Status = types.SubscriptionTransactionStatusFailed
		return dbTx.Save(tx).Error
	}

	now := time.Now()
	sub.PlanID = tx.NewPlanID
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// 更新配额
	if err := sp.updateQuota(ctx, sub.UserUID, tx.NewPlanName); err != nil {
		return err
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	return dbTx.Save(tx).Error
}

// handleRenewal 处理续订
func (sp *SubscriptionProcessor) handleRenewal(ctx context.Context, dbTx *gorm.DB, tx *types.SubscriptionTransaction) error {
	var sub types.Subscription
	if err := dbTx.Model(&types.Subscription{}).Where(&types.Subscription{UserUID: tx.UserUID, ID: tx.SubscriptionID}).Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch subscription: %w", err)
	}

	// 更新订阅时间
	now := time.Now()
	sub.Status = types.SubscriptionStatusNormal
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// //TODO: 续费赠送 credits
	plan, err := sp.AccountV2.GetSubscriptionPlan(tx.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}
	if err := cockroach.CreateCredits(dbTx, &types.Credits{
		UserUID:   sub.UserUID,
		Amount:    plan.GiftAmount,
		FromID:    sub.ID.String(),
		FromType:  types.CreditsFromTypeSubscription,
		ExpireAt:  sub.ExpireAt,
		CreatedAt: now,
		StartAt:   now,
		Status:    types.CreditsStatusActive,
	}); err != nil {
		return fmt.Errorf("failed to create credits: %w", err)
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	return dbTx.Save(tx).Error
}

// checkDowngradeConditions 检查降级条件
func (sp *SubscriptionProcessor) checkDowngradeConditions(_ context.Context, _ *types.Subscription, _ uuid.UUID) bool {
	// //TODO: 检查 disk、namespace、seat 等条件
	return true
}
