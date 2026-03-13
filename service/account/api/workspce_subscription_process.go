package api

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	services "github.com/labring/sealos/service/pkg/pay"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
	v1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

// WorkspaceSubscriptionProcessor 处理工作空间订阅事务的处理器
type WorkspaceSubscriptionProcessor struct {
	pollInterval time.Duration
	wg           sync.WaitGroup
	stopChan     chan struct{}
}

func NewWorkspaceSubscriptionProcessor() *WorkspaceSubscriptionProcessor {
	return &WorkspaceSubscriptionProcessor{
		pollInterval: 5 * time.Second,
		stopChan:     make(chan struct{}),
	}
}

// Start 开始监听和处理工作空间订阅事务
func (wsp *WorkspaceSubscriptionProcessor) Start(ctx context.Context) {
	wsp.wg.Add(1)
	go func() {
		defer wsp.wg.Done()
		ticker := time.NewTicker(wsp.pollInterval)
		defer ticker.Stop()
		idleCount := 0
		for {
			select {
			case <-ctx.Done():
				return
			case <-wsp.stopChan:
				return
			case <-ticker.C:
				count, err := wsp.processPendingTransactions(ctx)
				if err != nil {
					// log.Printf("Failed to process pending workspace subscription transactions: %v", err)
					logrus.Infof("process pending transactions failed: %v", err)
				}
				if count == 0 {
					idleCount++
					if idleCount > 5 { // increase the interval after 5 idle rounds
						ticker.Reset(wsp.pollInterval + 5*time.Second)
					}
				} else {
					idleCount = 0
					ticker.Reset(wsp.pollInterval)
				}
			}
		}
	}()
}

// Stop 停止处理器
func (wsp *WorkspaceSubscriptionProcessor) Stop() {
	close(wsp.stopChan)
	wsp.wg.Wait()
}

// processPendingTransactions 处理待处理的事务
func (wsp *WorkspaceSubscriptionProcessor) processPendingTransactions(
	ctx context.Context,
) (int, error) {
	var transactions []types.WorkspaceSubscriptionTransaction
	now := time.Now()

	// 查询local region 的待处理事务
	err := dao.DBClient.GetGlobalDB().
		WithContext(ctx).
		Model(&types.WorkspaceSubscriptionTransaction{}).
		Where("pay_status IN (?, ?, ?) AND start_at <= ? AND status NOT IN (?, ?, ?) AND region_domain = ?",
			types.SubscriptionPayStatusPaid,
			types.SubscriptionPayStatusNoNeed,
			types.SubscriptionPayStatusUnpaid,
			now,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionStatusFailed,
			types.SubscriptionTransactionStatusCanceled,
			dao.DBClient.GetLocalRegion().Domain).
		Find(&transactions).
		Error
	if err != nil {
		return 0, fmt.Errorf("failed to query pending workspace subscription transactions: %w", err)
	}

	// 处理已到期的余额订阅自动续费
	expiredCount, expiredErr := wsp.processExpiredBalanceSubscriptions(ctx)
	if expiredErr != nil {
		logrus.Errorf("Failed to process expired balance subscriptions: %v", expiredErr)
	}

	for i := range transactions {
		// 检查是否需要在当前区域处理该事务
		if transactions[i].RegionDomain != dao.DBClient.GetLocalRegion().Domain {
			continue
		}

		// wsp.AccountReconciler.Logger.Info("Processing workspace subscription transaction",
		//	"workspace", transactions[i].Workspace,
		//	"region", transactions[i].RegionDomain,
		//	"operator", transactions[i].Operator,
		//	"status", transactions[i].Status,
		//	"plan", transactions[i].NewPlanName)
		logrus.Infof(
			"Processing workspace subscription transaction, workspace: %s, region: %s, operator: %s, status: %s, plan: %s",
			transactions[i].Workspace,
			transactions[i].RegionDomain,
			transactions[i].Operator,
			transactions[i].Status,
			transactions[i].NewPlanName,
		)

		if err := wsp.processTransaction(ctx, &transactions[i]); err != nil {
			logrus.Errorf(
				"Failed to process workspace subscription transaction %s: %v",
				transactions[i].ID,
				err,
			)
		}
	}
	return len(transactions) + expiredCount, nil
}

// processTransaction 处理单个事务
func (wsp *WorkspaceSubscriptionProcessor) processTransaction(
	ctx context.Context,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	return dao.DBClient.GetGlobalDB().Transaction(func(dbTx *gorm.DB) error {
		latestTx := *tx

		// 检查是否仍需处理
		if !wsp.shouldProcessTransaction(&latestTx) {
			// wsp.Logger.Info("Workspace subscription transaction needn't processed", "id", latestTx.ID)
			logrus.Infof(
				"Skip processing transaction for workspace subscription transaction: %s",
				latestTx.ID,
			)
			return nil
		}

		// 根据操作类型分发处理
		handler, exists := map[types.SubscriptionOperator]func(context.Context, *gorm.DB, *types.WorkspaceSubscriptionTransaction) error{
			types.SubscriptionTransactionTypeCreated:    wsp.handleCreated,
			types.SubscriptionTransactionTypeUpgraded:   wsp.handleUpgrade,
			types.SubscriptionTransactionTypeDowngraded: wsp.handleDowngrade,
			types.SubscriptionTransactionTypeRenewed:    wsp.handleRenewal,
			types.SubscriptionTransactionTypeDeleted:    wsp.handleDeletion,
		}[latestTx.Operator]

		if !exists {
			// wsp.Logger.Info("Unknown operator", "operator", latestTx.Operator)
			logrus.Infof(
				"unknown operator for workspace subscription transaction: %s, operator: %s",
				latestTx.ID,
				latestTx.Operator,
			)
			return nil // 未知操作类型，跳过
		}
		return handler(ctx, dbTx, &latestTx)
	})
}

// shouldProcessTransaction 检查事务是否需要处理
func (wsp *WorkspaceSubscriptionProcessor) shouldProcessTransaction(
	tx *types.WorkspaceSubscriptionTransaction,
) bool {
	now := time.Now()
	if tx.Operator == types.SubscriptionTransactionTypeResumed {
		return false
	}
	return (tx.PayStatus == types.SubscriptionPayStatusPaid || tx.PayStatus == types.SubscriptionPayStatusNoNeed || tx.PayStatus == types.SubscriptionPayStatusUnpaid) &&
		!tx.StartAt.After(now) &&
		tx.Status != types.SubscriptionTransactionStatusCompleted &&
		tx.Status != types.SubscriptionTransactionStatusFailed
}

func (wsp *WorkspaceSubscriptionProcessor) handleCreated(
	ctx context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	return handleWorkspaceSubscriptionCreated(ctx, dbTx, tx)
}

func handleWorkspaceSubscriptionCreated(
	_ context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Debug().Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		First(&sub).Error; err == nil {
		tx.Status = types.SubscriptionTransactionStatusCompleted
		tx.UpdatedAt = time.Now().UTC()
		if err := dbTx.Save(tx).Error; err != nil {
			return fmt.Errorf("failed to update transaction: %w", err)
		}
		logrus.Infof(
			"Workspace subscription already exists, workspace: %s, region: %s, plan: %s",
			sub.Workspace,
			sub.RegionDomain,
			sub.PlanName,
		)
		return nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
	}
	if sub.Status == types.SubscriptionStatusDeleted {
		tx.Status = types.SubscriptionTransactionStatusCanceled
		tx.UpdatedAt = time.Now().UTC()
		return dbTx.Save(tx).Error
	}
	addPeriod, err := types.ParsePeriod(tx.Period)
	if err != nil {
		return fmt.Errorf("failed to parse period: %w", err)
	}
	now := time.Now().UTC()
	sub.ID = uuid.New()
	sub.UserUID = tx.UserUID
	sub.PlanName = tx.NewPlanName
	sub.Workspace = tx.Workspace
	sub.RegionDomain = tx.RegionDomain
	sub.Status = types.SubscriptionStatusNormal
	sub.TrafficStatus = types.WorkspaceTrafficStatusActive
	sub.CreateAt = now
	sub.CurrentPeriodStartAt = now
	sub.CurrentPeriodEndAt = now.Add(addPeriod)
	sub.CancelAtPeriodEnd = false
	sub.PayStatus = tx.PayStatus
	sub.UpdateAt = now
	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now

	if err := dbTx.Create(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}
	if err := dbTx.Save(&tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}

	if err = helper.AddTrafficPackage(dbTx, dao.K8sManager.GetClient(), &sub, plan, sub.CurrentPeriodEndAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to add traffic package: %w", err)
	}
	if err = cockroach.AddWorkspaceSubscriptionAIQuotaPackage(dbTx, sub.ID, plan.AIQuota, sub.CurrentPeriodEndAt, types.PKGFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to create AI quota package: %w", err)
	}
	if err := updateWorkspaceSubscriptionQuota(tx.NewPlanName, sub.Workspace); err != nil {
		return fmt.Errorf("failed to update workspace quota: %w", err)
	}
	return nil
}

// handleUpgrade 处理升级
func (wsp *WorkspaceSubscriptionProcessor) handleUpgrade(
	_ context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
	}
	addPeriod, err := types.ParsePeriod(tx.Period)
	if err != nil {
		return fmt.Errorf("failed to parse period: %w", err)
	}
	if sub.Status == types.SubscriptionStatusDeleted {
		tx.Status = types.SubscriptionTransactionStatusCanceled
		tx.UpdatedAt = time.Now().UTC()
		return dbTx.Save(tx).Error
	}
	now := time.Now()
	// 更新订阅信息
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	// sub.StartAt = now
	sub.UpdateAt = now
	sub.CurrentPeriodStartAt = now
	sub.CurrentPeriodEndAt = now.Add(addPeriod)
	// sub.ExpireAt = now.Add(addPeriod)
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}

	if err = helper.AddTrafficPackage(dbTx, dao.K8sManager.GetClient(), &sub, plan, sub.CurrentPeriodEndAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to add traffic package: %w", err)
	}
	if err = cockroach.AddWorkspaceSubscriptionAIQuotaPackage(dbTx, sub.ID, plan.AIQuota, sub.CurrentPeriodEndAt, types.PKGFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to create AI quota package: %w", err)
	}

	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}
	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = time.Now().UTC()
	if err := dbTx.Save(tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// 更新工作空间配额
	if err := updateWorkspaceSubscriptionQuota(tx.NewPlanName, sub.Workspace); err != nil {
		return err
	}
	return nil
}

// handleDowngrade 处理降级
func (wsp *WorkspaceSubscriptionProcessor) handleDowngrade(
	ctx context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
	}
	if sub.Status == types.SubscriptionStatusDeleted {
		tx.Status = types.SubscriptionTransactionStatusCanceled
		tx.UpdatedAt = time.Now().UTC()
		return dbTx.Save(tx).Error
	}

	// 检查降级条件
	if ok, err := wsp.checkWorkspaceDowngradeConditions(ctx, &sub, tx.NewPlanName); err != nil {
		return fmt.Errorf("failed to check workspace downgrade conditions: %w", err)
	} else if !ok {
		tx.Status = types.SubscriptionTransactionStatusFailed
		return dbTx.Save(tx).Error
	}

	// 检查配额条件
	if ok, err := wsp.checkWorkspaceQuotaConditions(ctx, sub.Workspace, tx.NewPlanName); err != nil {
		return fmt.Errorf("failed to check workspace quota conditions: %w", err)
	} else if !ok {
		tx.Status = types.SubscriptionTransactionStatusFailed
		return dbTx.Save(tx).Error
	}
	addPeriod, err := types.ParsePeriod(tx.Period)
	if err != nil {
		return fmt.Errorf("failed to parse period: %w", err)
	}
	now := time.Now()
	sub.PlanName = tx.NewPlanName
	// sub.Status = types.SubscriptionStatusNormal
	// sub.StartAt = now
	sub.CurrentPeriodStartAt = now
	sub.CurrentPeriodEndAt = now.Add(addPeriod)
	sub.UpdateAt = now
	// sub.ExpireAt = now.Add(addPeriod)

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(tx.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	price := getCurrentWorkspacePlanPrice(plan, tx.Period)
	if tx.PayStatus == types.SubscriptionPayStatusUnpaid {
		tx.PayStatus = types.SubscriptionPayStatusPending
		// 需要创建订阅支付
		if sub.PayMethod == types.PaymentMethodStripe && price != nil && price.StripePrice != nil &&
			sub.Stripe != nil &&
			sub.Stripe.SubscriptionID != "" {
			_, err := services.StripeServiceInstance.DowngradePlan(
				sub.Stripe.SubscriptionID,
				*price.StripePrice,
				tx.NewPlanName,
				tx.ID,
			)
			if err != nil {
				return fmt.Errorf("failed to update stripe subscription: %w", err)
			}
		}
		tx.Status = types.SubscriptionTransactionStatusPending
		return dbTx.Save(tx).Error
	}
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}
	if err := dbTx.Save(tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}
	return updateWorkspaceSubscriptionQuota(tx.NewPlanName, sub.Workspace)
}

// handleRenewal 处理续订
func (wsp *WorkspaceSubscriptionProcessor) handleRenewal(
	_ context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
	}
	addPeriod, err := types.ParsePeriod(tx.Period)
	if err != nil {
		return fmt.Errorf("failed to parse period: %w", err)
	}
	if sub.Status == types.SubscriptionStatusDeleted {
		tx.Status = types.SubscriptionTransactionStatusCanceled
		tx.UpdatedAt = time.Now().UTC()
		return dbTx.Save(tx).Error
	}
	now := time.Now()
	if sub.CurrentPeriodEndAt.Before(now) {
		sub.CurrentPeriodEndAt = now
		sub.CurrentPeriodEndAt = now.Add(addPeriod)
	} else {
		sub.CurrentPeriodEndAt = sub.CurrentPeriodEndAt.Add(addPeriod)
	}
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	if err = helper.AddTrafficPackage(dbTx, dao.K8sManager.GetClient(), &sub, plan, sub.CurrentPeriodEndAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to add traffic package: %w", err)
	}
	if err = cockroach.AddWorkspaceSubscriptionAIQuotaPackage(dbTx, sub.ID, plan.AIQuota, sub.CurrentPeriodEndAt, types.PKGFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to create AI quota package: %w", err)
	}
	sub.Status = types.SubscriptionStatusNormal
	sub.UpdateAt = now
	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}
	return dbTx.Save(tx).Error
}

// handleDeletion 处理删除（取消订阅）
func (wsp *WorkspaceSubscriptionProcessor) handleDeletion(
	ctx context.Context,
	dbTx *gorm.DB,
	tx *types.WorkspaceSubscriptionTransaction,
) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		First(&sub).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 订阅已经不存在，直接标记事务为完成
			tx.Status = types.SubscriptionTransactionStatusCompleted
			tx.UpdatedAt = time.Now().UTC()
			return dbTx.Save(tx).Error
		}
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
	}

	// 检查订阅是否已经处于删除状态
	if sub.Status == types.SubscriptionStatusDeleted {
		tx.Status = types.SubscriptionTransactionStatusCompleted
		tx.UpdatedAt = time.Now().UTC()
		return dbTx.Save(tx).Error
	}

	now := time.Now().UTC()

	// 更新订阅状态为删除状态
	sub.Status = types.SubscriptionStatusDeleted
	sub.CancelAt = now
	sub.UpdateAt = now

	// 如果是付费订阅，需要取消Stripe订阅
	if sub.PayStatus == types.SubscriptionPayStatusPaid &&
		sub.PayMethod == types.PaymentMethodStripe &&
		sub.Stripe != nil &&
		sub.Stripe.SubscriptionID != "" {
		// 取消Stripe订阅
		if _, err := services.StripeServiceInstance.CancelSubscription(sub.Stripe.SubscriptionID); err != nil {
			// logrus.Errorf("Failed to cancel Stripe subscription %s: %v", sub.Stripe.SubscriptionID, err)
			dao.Logger.Errorf(
				"Failed to cancel Stripe subscription %s: %v",
				sub.Stripe.SubscriptionID,
				err,
			)
			// 记录错误但不阻止删除过程
			// TODO too long
			// tx.StatusDesc = fmt.Sprintf("Stripe cancellation failed: %v", err)
			// return fmt.Errorf("failed to cancel Stripe subscription %s: %w", sub.Stripe.SubscriptionID, err)
		}
		sub.PayStatus = types.SubscriptionPayStatusCanceled
	} else {
		// 非付费订阅或其他支付方式，直接设置为取消状态
		sub.PayStatus = types.SubscriptionPayStatusCanceled
	}

	// 保存订阅更新
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}

	// 更新事务状态
	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	if err := dbTx.Save(tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// 设置namespace的final删除标签，标记资源需要最终删除
	if err := updateDebtNamespaceStatus(ctx, dao.K8sManager.GetClient(), FinalDeletionDebtNamespaceAnnoStatus, []string{sub.Workspace}); err != nil {
		// logrus.Errorf("Failed to set final deletion annotation for workspace %s: %v", sub.Workspace, err)
		dao.Logger.Errorf(
			"Failed to set final deletion annotation for workspace %s: %v",
			sub.Workspace,
			err,
		)
		return fmt.Errorf(
			"failed to set final deletion annotation for workspace %s: %w",
			sub.Workspace,
			err,
		)
	}

	logrus.Infof("Successfully processed workspace subscription deletion: workspace=%s, region=%s",
		sub.Workspace, sub.RegionDomain)

	return nil
}

// checkWorkspaceDowngradeConditions 检查工作空间降级条件
// TODO: 需要后续实现更多具体的降级条件检查逻辑
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceDowngradeConditions(
	_ context.Context,
	subscription *types.WorkspaceSubscription,
	newPlanName string,
) (bool, error) {
	// 例如：检查工作空间内的资源使用情况是否满足新计划的限制
	// wsp.Logger.Info("Checking workspace downgrade conditions",
	//	"workspace", subscription.Workspace,
	//	"region", subscription.RegionDomain,
	//	"currentPlan", subscription.PlanName,
	//	"targetPlan", newPlanName)
	return true, nil
}

// checkWorkspaceQuotaConditions 检查工作空间配额条件
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceQuotaConditions(
	ctx context.Context,
	workspace, planName string,
) (bool, error) {
	// wsp.Logger.Info("Checking workspace quota conditions",
	//	"workspace", workspace,
	//	"region", regionDomain,
	//	"planName", planName)
	return CheckQuota(ctx, workspace, planName)
}

func CheckQuota(ctx context.Context, workspace, planName string) (bool, error) {
	planLimitRes, ok := dao.WorkspacePlanResQuota[planName]
	if !ok {
		return true, nil
	}
	var quota v1.ResourceQuota
	err := dao.K8sManager.GetClient().
		Get(ctx, types2.NamespacedName{Name: "quota-" + workspace, Namespace: workspace}, &quota)
	if client.IgnoreNotFound(err) != nil {
		return false, fmt.Errorf(
			"failed to get resource quota for workspace %s: %w",
			workspace,
			err,
		)
	}
	if len(quota.Status.Used) > 0 {
		for res, limit := range planLimitRes {
			used := quota.Status.Used[res]
			if used.Cmp(limit) == 1 {
				logrus.Warnf(
					"Workspace %s exceeds quota for resource %s: used %s, limit %s",
					workspace,
					res.String(),
					used.String(),
					limit.String(),
				)
				return false, nil
			}
		}
	}
	return true, nil
}

// processExpiredBalanceSubscriptions 处理已到期的余额支付订阅
// 1. The current cycle is about to end (within 20 minutes) and the expiration time is longer than the end time of the current cycle - renewal is required
// 2. The situation where the current cycle has ended and needs to be renewed
func (wsp *WorkspaceSubscriptionProcessor) processExpiredBalanceSubscriptions(
	ctx context.Context,
) (int, error) {
	var subscriptionsToProcess []types.WorkspaceSubscription
	now := time.Now().UTC()
	renewalThreshold := now.Add(20 * time.Minute)
	localDomain := dao.DBClient.GetLocalRegion().Domain
	normalStatus := types.SubscriptionStatusNormal
	canceledStatus := types.SubscriptionPayStatusCanceled
	balancePayMethod := types.PaymentMethodBalance

	err := dao.DBClient.GetGlobalDB().WithContext(ctx).
		Model(&types.WorkspaceSubscription{}).
		Where("current_period_end_at <= ? AND status = ? AND region_domain = ? AND pay_status != ? AND cancel_at_period_end = false AND (pay_method = ? OR (expire_at > current_period_end_at))",
			renewalThreshold,
			normalStatus,
			localDomain,
			canceledStatus,
			balancePayMethod).
		Find(&subscriptionsToProcess).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query subscriptions needing period renewal: %w", err)
	}

	if len(subscriptionsToProcess) == 0 {
		return 0, nil
	}
	logrus.Infof(
		"Found %d subscriptions needing period renewal (includes expired and expiring subscriptions with remaining prepaid time)",
		len(subscriptionsToProcess),
	)

	processedCount := 0
	for i := range subscriptionsToProcess {
		if err := wsp.processPeriodRenewal(ctx, &subscriptionsToProcess[i]); err != nil {
			dao.Logger.Errorf(
				"Failed to process period renewal for subscription %s: %v",
				subscriptionsToProcess[i].ID,
				err,
			)
		} else {
			processedCount++
		}
	}

	return processedCount, nil
}

// processPeriodRenewal 处理订阅的周期续期
func (wsp *WorkspaceSubscriptionProcessor) processPeriodRenewal(
	ctx context.Context,
	sub *types.WorkspaceSubscription,
) error {
	return dao.DBClient.GetGlobalDB().Transaction(func(dbTx *gorm.DB) error {
		// Re-obtain the latest subscription status to prevent concurrent issues
		var latestSub types.WorkspaceSubscription
		if err := dbTx.Where("id = ?", sub.ID).First(&latestSub).Error; err != nil {
			return fmt.Errorf("failed to get latest subscription: %w", err)
		}

		// check again to see if any processing is needed
		now := time.Now().UTC()

		// 检查订阅状态
		if latestSub.Status != types.SubscriptionStatusNormal {
			logrus.Infof("Subscription %s status is not normal, skipping", latestSub.ID)
			return nil
		}

		// Check if the current cycle has not yet reached the renewal time (leave a 20-minute buffer)
		if latestSub.CurrentPeriodEndAt.After(now.Add(20 * time.Minute)) {
			logrus.Infof("Subscription %s current period not yet ending (ends at %s), skipping",
				latestSub.ID, latestSub.CurrentPeriodEndAt.Format(time.RFC3339))
			return nil
		}

		// determine whether the subscription has expired
		isExpired := latestSub.CurrentPeriodEndAt.Before(now)

		// obtain plan information
		plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(latestSub.PlanName)
		if err != nil {
			return fmt.Errorf(
				"failed to get workspace subscription plan %s: %w",
				latestSub.PlanName,
				err,
			)
		}

		// Calculate the new cycle time
		// For expired subscriptions, the new cycle begins now; For subscriptions that are about to expire, start from the end time of the current cycle
		var newPeriodStart time.Time
		if isExpired {
			newPeriodStart = now
		} else {
			newPeriodStart = latestSub.CurrentPeriodEndAt
		}

		monthlyPeriod, _ := types.ParsePeriod(types.SubscriptionPeriodMonthly)
		potentialPeriodEnd := newPeriodStart.Add(monthlyPeriod)

		newPeriodEnd := potentialPeriodEnd
		needsPayment := false
		var paymentID string
		var paymentAmount int64 = 0

		// 检查是否还有剩余订阅时长
		if potentialPeriodEnd.After(*latestSub.ExpireAt) {
			if latestSub.CurrentPeriodEndAt.Before(*latestSub.ExpireAt) {
				newPeriodEnd = *latestSub.ExpireAt
			} else {
				needsPayment = true
			}
		}

		if needsPayment {
			// Only subscriptions with balance payments are processed here. Other payment methods such as stripe are not handled
			if latestSub.PayMethod != types.PaymentMethodBalance {
				return nil
			}
			price, err := dao.DBClient.GetWorkspaceSubscriptionPlanPrice(
				latestSub.PlanName,
				types.SubscriptionPeriodMonthly,
			)
			if err != nil {
				return fmt.Errorf("failed to get plan price for %s: %w", latestSub.PlanName, err)
			}

			account, err := dao.DBClient.GetAccount(types.UserQueryOpts{UID: latestSub.UserUID})
			if err != nil {
				return fmt.Errorf("failed to get account for user %s: %w", latestSub.UserUID, err)
			}

			availableBalance := account.Balance - account.DeductionBalance
			if availableBalance < price.Price {
				return wsp.handleInsufficientBalance(
					ctx,
					dbTx,
					&latestSub,
					price.Price,
					availableBalance,
				)
			}
			_payID, err := gonanoid.New(12)
			if err != nil {
				return fmt.Errorf("failed to create payment id: %w", err)
			}
			paymentID = _payID
			paymentAmount = price.Price
			if err := cockroach.AddDeductionAccount(dbTx, latestSub.UserUID, price.Price); err != nil {
				return fmt.Errorf("failed to deduct balance: %w", err)
			}

			payment := types.Payment{
				ID: paymentID,
				PaymentRaw: types.PaymentRaw{
					UserUID:                 latestSub.UserUID,
					RegionUID:               dao.DBClient.GetLocalRegion().UID,
					CreatedAt:               now,
					Method:                  types.PaymentMethodBalance,
					Amount:                  price.Price,
					TradeNO:                 paymentID,
					Type:                    types.PaymentTypeSubscription,
					ChargeSource:            types.ChargeSourceBalance,
					Status:                  types.PaymentStatusPAID,
					WorkspaceSubscriptionID: &latestSub.ID,
					Message: fmt.Sprintf(
						"Period renewal payment for workspace %s/%s",
						latestSub.Workspace,
						latestSub.RegionDomain,
					),
				},
			}
			if err := dbTx.Create(&payment).Error; err != nil {
				return fmt.Errorf("failed to create payment record: %w", err)
			}
		}

		latestSub.CurrentPeriodStartAt = newPeriodStart
		latestSub.CurrentPeriodEndAt = newPeriodEnd
		latestSub.Status = types.SubscriptionStatusNormal
		latestSub.TrafficStatus = types.WorkspaceTrafficStatusActive
		latestSub.UpdateAt = now

		if err := dbTx.Save(&latestSub).Error; err != nil {
			return fmt.Errorf("failed to update subscription: %w", err)
		}

		var payStatus types.SubscriptionPayStatus
		var statusDesc string

		if needsPayment {
			payStatus = types.SubscriptionPayStatusPaid
			statusDesc = "Auto period renewal with payment by processor"
		} else {
			payStatus = types.SubscriptionPayStatusNoNeed
			statusDesc = "Auto period renewal using prepaid time (no payment needed)"
		}

		transaction := types.WorkspaceSubscriptionTransaction{
			ID:            uuid.New(),
			From:          types.TransactionFromSystem,
			Workspace:     latestSub.Workspace,
			RegionDomain:  latestSub.RegionDomain,
			UserUID:       latestSub.UserUID,
			OldPlanName:   latestSub.PlanName,
			NewPlanName:   latestSub.PlanName,
			OldPlanStatus: types.SubscriptionStatusNormal,
			Operator:      types.SubscriptionTransactionTypeRenewed,
			StartAt:       now,
			CreatedAt:     now,
			UpdatedAt:     now,
			Status:        types.SubscriptionTransactionStatusCompleted,
			StatusDesc:    statusDesc,
			PayStatus:     payStatus,
			PayID:         paymentID,
			Period:        types.SubscriptionPeriodMonthly,
			Amount:        paymentAmount,
		}

		if err := dbTx.Create(&transaction).Error; err != nil {
			return fmt.Errorf("failed to create renewal transaction: %w", err)
		}

		if err = helper.AddTrafficPackage(dbTx, dao.K8sManager.GetClient(), &latestSub, plan, newPeriodEnd, types.WorkspaceTrafficFromWorkspaceSubscription, transaction.ID.String()); err != nil {
			return fmt.Errorf("failed to add traffic package: %w", err)
		}

		if err = cockroach.AddWorkspaceSubscriptionAIQuotaPackage(dbTx, latestSub.ID, plan.AIQuota, newPeriodEnd, types.PKGFromWorkspaceSubscription, transaction.ID.String()); err != nil {
			return fmt.Errorf("failed to create AI quota package: %w", err)
		}

		logrus.Infof(
			"Successfully processed period renewal for workspace %s, new period: %s to %s, expire_at: %s",
			latestSub.Workspace,
			latestSub.CurrentPeriodStartAt.Format(time.RFC3339),
			latestSub.CurrentPeriodEndAt.Format(time.RFC3339),
			latestSub.ExpireAt.Format(time.RFC3339),
		)

		return nil
	})
}

// handleInsufficientBalance 处理余额不足的情况
func (wsp *WorkspaceSubscriptionProcessor) handleInsufficientBalance(
	ctx context.Context,
	dbTx *gorm.DB,
	sub *types.WorkspaceSubscription,
	requiredAmount, availableBalance int64,
) error {
	now := time.Now().UTC()

	logrus.Warnf(
		"Insufficient balance for subscription renewal: workspace=%s, required=%d, available=%d",
		sub.Workspace,
		requiredAmount,
		availableBalance,
	)

	// 更新订阅状态为欠费
	sub.Status = types.SubscriptionStatusDebt
	sub.PayStatus = types.SubscriptionPayStatusUnpaid
	sub.UpdateAt = now

	if err := dbTx.Save(sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription status to debt: %w", err)
	}

	// 创建续费失败的事务记录
	failedTransaction := types.WorkspaceSubscriptionTransaction{
		ID:            uuid.New(),
		From:          types.TransactionFromSystem,
		Workspace:     sub.Workspace,
		RegionDomain:  sub.RegionDomain,
		UserUID:       sub.UserUID,
		OldPlanName:   sub.PlanName,
		NewPlanName:   sub.PlanName,
		OldPlanStatus: types.SubscriptionStatusNormal,
		Operator:      types.SubscriptionTransactionTypeRenewed,
		StartAt:       now,
		CreatedAt:     now,
		UpdatedAt:     now,
		Status:        types.SubscriptionTransactionStatusFailed,
		StatusDesc: fmt.Sprintf(
			"Insufficient balance: required %d, available %d",
			requiredAmount,
			availableBalance,
		),
		PayStatus: types.SubscriptionPayStatusFailed,
		Period:    types.SubscriptionPeriodMonthly,
		Amount:    requiredAmount,
	}

	if err := dbTx.Create(&failedTransaction).Error; err != nil {
		return fmt.Errorf("failed to create failed renewal transaction: %w", err)
	}

	userUID := sub.UserUID
	nr, err := dao.DBClient.GetNotificationRecipient(sub.UserUID)
	if err != nil {
		// logrus.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
		dao.Logger.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
	}
	dao.UserContactProvider.SetUserContact(userUID, nr)
	defer dao.UserContactProvider.RemoveUserContact(userUID)

	eventData := &usernotify.WorkspaceSubscriptionDebtEventData{
		Type:          usernotify.EventTypeWorkspaceSubscriptionDebt,
		PlanName:      sub.PlanName,
		LastStatus:    types.SubscriptionStatusNormal,
		CurrentStatus: types.SubscriptionStatusDebt,
		DebtDays:      7,
		RegionDomain:  sub.RegionDomain,
		WorkspaceName: sub.Workspace,
		ExpirationDate: fmt.Sprintf(
			"%s-%s",
			sub.CurrentPeriodStartAt.Format(time.DateOnly),
			sub.CurrentPeriodEndAt.Format(time.DateOnly),
		),
	}
	// TODO: 暂停服务+通知用户等后续处理
	// if err := wdp.sendWorkspaceDesktopNotice(ctx, currentDebtStatus, namespaces); err != nil {
	//	return fmt.Errorf("send workspace desktop notice error: %w", err)
	//}
	//
	//// 更新工作空间状态
	// if err := wdp.updateWorkspaceDebtStatus(ctx, types.SuspendDebtNamespaceAnnoStatus, namespaces); err != nil {
	//	return fmt.Errorf("update workspace debt status error: %w", err)
	//}
	if err := updateDebtNamespaceStatus(ctx, dao.K8sManager.GetClient(), SuspendDebtNamespaceAnnoStatus, []string{sub.Workspace}); err != nil {
		return fmt.Errorf(
			"failed to set suspend debt annotation for workspace %s: %w",
			sub.Workspace,
			err,
		)
	}
	if _, err := dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), sub.UserUID, eventData, types.SubscriptionTransactionTypeDebt, []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
		dao.Logger.Errorf(
			"failed to send subscription success notification for user %s: %v",
			sub.UserUID,
			err,
		)
		// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
	}

	logrus.Infof(
		"Created debt status and failed transaction for workspace %s due to insufficient balance",
		sub.Workspace,
	)
	return nil
}
