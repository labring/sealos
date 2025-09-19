package api

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"sigs.k8s.io/controller-runtime/pkg/client"

	v1 "k8s.io/api/core/v1"
	types2 "k8s.io/apimachinery/pkg/types"

	services "github.com/labring/sealos/service/pkg/pay"

	"github.com/labring/sealos/service/account/helper"

	"github.com/labring/sealos/service/account/dao"
	"github.com/sirupsen/logrus"

	"github.com/google/uuid"

	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
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
func (wsp *WorkspaceSubscriptionProcessor) processPendingTransactions(ctx context.Context) (int, error) {
	var transactions []types.WorkspaceSubscriptionTransaction
	now := time.Now()

	// 查询local region 的待处理事务
	err := dao.DBClient.GetGlobalDB().WithContext(ctx).Model(&types.WorkspaceSubscriptionTransaction{}).
		Where("pay_status IN (?, ?, ?) AND start_at <= ? AND status NOT IN (?, ?) AND region_domain = ?",
			types.SubscriptionPayStatusPaid,
			types.SubscriptionPayStatusNoNeed,
			types.SubscriptionPayStatusUnpaid,
			now,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionStatusFailed,
			dao.DBClient.GetLocalRegion().Domain).
		Find(&transactions).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query pending workspace subscription transactions: %w", err)
	}

	for i := range transactions {
		// 检查是否需要在当前区域处理该事务
		if transactions[i].RegionDomain != dao.DBClient.GetLocalRegion().Domain {
			continue
		}

		//wsp.AccountReconciler.Logger.Info("Processing workspace subscription transaction",
		//	"workspace", transactions[i].Workspace,
		//	"region", transactions[i].RegionDomain,
		//	"operator", transactions[i].Operator,
		//	"status", transactions[i].Status,
		//	"plan", transactions[i].NewPlanName)
		logrus.Infof("Processing workspace subscription transaction, workspace: %s, region: %s, operator: %s, status: %s, plan: %s",
			transactions[i].Workspace, transactions[i].RegionDomain, transactions[i].Operator, transactions[i].Status, transactions[i].NewPlanName)

		if err := wsp.processTransaction(ctx, &transactions[i]); err != nil {
			logrus.Errorf("Failed to process workspace subscription transaction %s: %v", transactions[i].ID, err)
		}
	}
	return len(transactions), nil
}

// processTransaction 处理单个事务
func (wsp *WorkspaceSubscriptionProcessor) processTransaction(ctx context.Context, tx *types.WorkspaceSubscriptionTransaction) error {
	return dao.DBClient.GetGlobalDB().Transaction(func(dbTx *gorm.DB) error {
		latestTx := *tx

		// 检查是否仍需处理
		if !wsp.shouldProcessTransaction(&latestTx) {
			// wsp.Logger.Info("Workspace subscription transaction needn't processed", "id", latestTx.ID)
			logrus.Infof("Skip processing transaction for workspace subscription transaction: %s", latestTx.ID)
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
			logrus.Infof("unknown operator for workspace subscription transaction: %s, operator: %s", latestTx.ID, latestTx.Operator)
			return nil // 未知操作类型，跳过
		}
		return handler(ctx, dbTx, &latestTx)
	})
}

// shouldProcessTransaction 检查事务是否需要处理
func (wsp *WorkspaceSubscriptionProcessor) shouldProcessTransaction(tx *types.WorkspaceSubscriptionTransaction) bool {
	now := time.Now()
	return (tx.PayStatus == types.SubscriptionPayStatusPaid || tx.PayStatus == types.SubscriptionPayStatusNoNeed || tx.PayStatus == types.SubscriptionPayStatusUnpaid) &&
		!tx.StartAt.After(now) &&
		tx.Status != types.SubscriptionTransactionStatusCompleted &&
		tx.Status != types.SubscriptionTransactionStatusFailed
}

func (wsp *WorkspaceSubscriptionProcessor) handleCreated(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
	return handleWorkspaceSubscriptionCreated(ctx, dbTx, tx)
}

func handleWorkspaceSubscriptionCreated(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Debug().Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		First(&sub).Error; err == nil {
		tx.Status = types.SubscriptionTransactionStatusCompleted
		tx.UpdatedAt = time.Now().UTC()
		if err := dbTx.Save(tx).Error; err != nil {
			return fmt.Errorf("failed to update transaction: %w", err)
		}
		logrus.Infof("Workspace subscription already exists, workspace: %s, region: %s, plan: %s", sub.Workspace, sub.RegionDomain, sub.PlanName)
		return nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
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
	if err := updateWorkspaceSubscriptionQuota(tx.NewPlanName, sub.Workspace); err != nil {
		return fmt.Errorf("failed to update workspace quota: %w", err)
	}
	return nil
}

// handleUpgrade 处理升级
func (wsp *WorkspaceSubscriptionProcessor) handleUpgrade(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
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
	now := time.Now()
	// 更新订阅信息
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	//sub.StartAt = now
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
func (wsp *WorkspaceSubscriptionProcessor) handleDowngrade(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		Find(&sub).Error; err != nil {
		return fmt.Errorf("failed to fetch workspace subscription: %w", err)
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
	//sub.Status = types.SubscriptionStatusNormal
	//sub.StartAt = now
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
		if sub.PayMethod == types.PaymentMethodStripe && price != nil && price.StripePrice != nil && sub.Stripe != nil && sub.Stripe.SubscriptionID != "" {
			_, err := services.StripeServiceInstance.DowngradePlan(sub.Stripe.SubscriptionID, *price.StripePrice, tx.NewPlanName, tx.ID)
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
func (wsp *WorkspaceSubscriptionProcessor) handleRenewal(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
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
func (wsp *WorkspaceSubscriptionProcessor) handleDeletion(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
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
	if sub.PayStatus == types.SubscriptionPayStatusPaid && sub.PayMethod == types.PaymentMethodStripe &&
		sub.Stripe != nil && sub.Stripe.SubscriptionID != "" {
		// 取消Stripe订阅
		if _, err := services.StripeServiceInstance.CancelSubscription(sub.Stripe.SubscriptionID); err != nil {
			//logrus.Errorf("Failed to cancel Stripe subscription %s: %v", sub.Stripe.SubscriptionID, err)
			dao.Logger.Errorf("Failed to cancel Stripe subscription %s: %v", sub.Stripe.SubscriptionID, err)
			// 记录错误但不阻止删除过程
			tx.StatusDesc = fmt.Sprintf("Stripe cancellation failed: %v", err)
			//return fmt.Errorf("failed to cancel Stripe subscription %s: %w", sub.Stripe.SubscriptionID, err)
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
		dao.Logger.Errorf("Failed to set final deletion annotation for workspace %s: %v", sub.Workspace, err)
		return fmt.Errorf("failed to set final deletion annotation for workspace %s: %v", sub.Workspace, err)
	}

	logrus.Infof("Successfully processed workspace subscription deletion: workspace=%s, region=%s",
		sub.Workspace, sub.RegionDomain)

	return nil
}

// checkWorkspaceDowngradeConditions 检查工作空间降级条件
// TODO: 需要后续实现更多具体的降级条件检查逻辑
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceDowngradeConditions(_ context.Context, subscription *types.WorkspaceSubscription, newPlanName string) (bool, error) {
	// 例如：检查工作空间内的资源使用情况是否满足新计划的限制
	// wsp.Logger.Info("Checking workspace downgrade conditions",
	//	"workspace", subscription.Workspace,
	//	"region", subscription.RegionDomain,
	//	"currentPlan", subscription.PlanName,
	//	"targetPlan", newPlanName)
	return true, nil
}

// checkWorkspaceQuotaConditions 检查工作空间配额条件
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceQuotaConditions(ctx context.Context, workspace, planName string) (bool, error) {
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
	err := dao.K8sManager.GetClient().Get(ctx, types2.NamespacedName{Name: "quota-" + workspace, Namespace: workspace}, &quota)
	if client.IgnoreNotFound(err) != nil {
		return false, fmt.Errorf("failed to get resource quota for workspace %s: %w", workspace, err)
	}
	if len(quota.Status.Used) > 0 {
		for res, limit := range planLimitRes {
			used := quota.Status.Used[res]
			if used.Cmp(limit) == 1 {
				logrus.Warnf("Workspace %s exceeds quota for resource %s: used %s, limit %s", workspace, res.String(), used.String(), limit.String())
				return false, nil
			}
		}
	}
	return true, nil
}
