package controllers

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	types2 "k8s.io/apimachinery/pkg/types"

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	v1 "k8s.io/api/core/v1"

	"github.com/labring/sealos/controllers/pkg/resources"

	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
)

// WorkspaceSubscriptionProcessor 处理工作空间订阅事务的处理器
type WorkspaceSubscriptionProcessor struct {
	*WorkspaceTrafficController
	db                 *gorm.DB
	pollInterval       time.Duration
	wg                 sync.WaitGroup
	stopChan           chan struct{}
	plans              []types.WorkspaceSubscriptionPlan
	plansResourceLimit map[string]v1.ResourceList
	*AccountReconciler
}

// TODO 需要添加用户通知
func NewWorkspaceSubscriptionProcessor(reconciler *AccountReconciler, workspaceTrafficProcessor *WorkspaceTrafficController) (*WorkspaceSubscriptionProcessor, error) {
	plans, err := reconciler.AccountV2.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		return nil, fmt.Errorf("failed to get workspace subscription plans: %w", err)
	}
	res, err := resources.ParseResourceLimitWithPlans(plans)
	if err != nil {
		return nil, fmt.Errorf("failed to parse resource limits with plans: %w", err)
	}
	return &WorkspaceSubscriptionProcessor{
		WorkspaceTrafficController: workspaceTrafficProcessor,
		db:                         reconciler.AccountV2.GetGlobalDB(),
		plans:                      plans,
		plansResourceLimit:         res,
		pollInterval:               5 * time.Second,
		stopChan:                   make(chan struct{}),
		AccountReconciler:          reconciler,
	}, nil
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
					log.Printf("Failed to process pending workspace subscription transactions: %v", err)
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

	// 查询待处理事务
	err := wsp.db.WithContext(ctx).Model(&types.WorkspaceSubscriptionTransaction{}).
		Where("pay_status IN (?, ?) AND start_at <= ? AND status NOT IN (?, ?) AND region_domain = ?",
			types.SubscriptionPayStatusPaid,
			types.SubscriptionPayStatusNoNeed,
			now,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionStatusFailed,
			wsp.localDomain).
		Find(&transactions).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query pending workspace subscription transactions: %w", err)
	}

	for i := range transactions {
		// 检查是否需要在当前区域处理该事务
		if transactions[i].RegionDomain != wsp.localDomain {
			continue
		}

		wsp.AccountReconciler.Logger.Info("Processing workspace subscription transaction",
			"workspace", transactions[i].Workspace,
			"region", transactions[i].RegionDomain,
			"operator", transactions[i].Operator,
			"status", transactions[i].Status,
			"plan", transactions[i].NewPlanName)

		if err := wsp.processTransaction(ctx, &transactions[i]); err != nil {
			wsp.Logger.Error(fmt.Errorf("failed to process workspace subscription transaction: %w", err), "", "id", transactions[i].ID)
		}
	}
	return len(transactions), nil
}

// processTransaction 处理单个事务
func (wsp *WorkspaceSubscriptionProcessor) processTransaction(ctx context.Context, tx *types.WorkspaceSubscriptionTransaction) error {
	return wsp.db.Transaction(func(dbTx *gorm.DB) error {
		latestTx := *tx

		// 检查是否仍需处理
		if !wsp.shouldProcessTransaction(&latestTx) {
			wsp.Logger.Info("Workspace subscription transaction needn't processed", "id", latestTx.ID)
			return nil
		}

		// 根据操作类型分发处理
		handler, exists := map[types.SubscriptionOperator]func(context.Context, *gorm.DB, *types.WorkspaceSubscriptionTransaction) error{
			types.SubscriptionTransactionTypeCreated:    wsp.handleCreated,
			types.SubscriptionTransactionTypeUpgraded:   wsp.handleUpgrade,
			types.SubscriptionTransactionTypeDowngraded: wsp.handleDowngrade,
			types.SubscriptionTransactionTypeRenewed:    wsp.handleRenewal,
		}[latestTx.Operator]

		if !exists {
			wsp.Logger.Info("Unknown operator", "operator", latestTx.Operator)
			return nil // 未知操作类型，跳过
		}

		return handler(ctx, dbTx, &latestTx)
	})
}

// shouldProcessTransaction 检查事务是否需要处理
func (wsp *WorkspaceSubscriptionProcessor) shouldProcessTransaction(tx *types.WorkspaceSubscriptionTransaction) bool {
	now := time.Now()
	return (tx.PayStatus == types.SubscriptionPayStatusPaid || tx.PayStatus == types.SubscriptionPayStatusNoNeed) &&
		!tx.StartAt.After(now) &&
		tx.Status != types.SubscriptionTransactionStatusCompleted &&
		tx.Status != types.SubscriptionTransactionStatusFailed
}

// updateWorkspaceQuota 更新工作空间的资源配额
func (wsp *WorkspaceSubscriptionProcessor) updateWorkspaceQuota(ctx context.Context, workspace, planName string) error {
	rs, ok := wsp.plansResourceLimit[planName]
	if !ok {
		return fmt.Errorf("plan %s not found in workspace subscription plans", planName)
	}
	quota := getDefaultResourceQuota(workspace, "quota-"+workspace, rs)
	hard := quota.Spec.Hard.DeepCopy()
	_, err := controllerutil.CreateOrUpdate(ctx, wsp.Client, quota, func() error {
		quota.Spec.Hard = hard
		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to create or update resource quota: %w", err)
	}
	ns := &v1.Namespace{}
	if err := wsp.Get(ctx, types2.NamespacedName{Name: workspace}, ns); err != nil {
		return err
	}
	if ns.Annotations == nil {
		ns.Annotations = make(map[string]string)
	}
	if ns.Annotations[types.WorkspaceStatusAnnoKey] != types.WorkspaceStatusSubscription {
		ns.Annotations[types.WorkspaceStatusAnnoKey] = types.WorkspaceStatusSubscription
		if err := wsp.Update(ctx, ns); err != nil {
			return fmt.Errorf("failed to update workspace namespace annotations: %w", err)
		}
	}
	return nil
}

type AdminFlushWorkspaceQuotaReq struct {
	Workspace string `json:"workspace" bson:"workspace"`
	PlanName  string `json:"planName" bson:"planName"`
}

// handleCreated 处理创建工作空间订阅
func (wsp *WorkspaceSubscriptionProcessor) handleCreated(ctx context.Context, dbTx *gorm.DB, tx *types.WorkspaceSubscriptionTransaction) error {
	var sub types.WorkspaceSubscription
	if err := dbTx.Model(&types.WorkspaceSubscription{}).
		Where("workspace = ? AND region_domain = ?", tx.Workspace, tx.RegionDomain).
		Find(&sub).Error; err == nil {
		return nil
	}

	addPeriod, err := types.ParsePeriod(tx.Period)
	if err != nil {
		return fmt.Errorf("failed to parse period: %w", err)
	}
	now := time.Now().UTC()
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.Add(addPeriod)

	if err := dbTx.Create(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}
	plan, err := wsp.AccountV2.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	// 添加流量包
	if err = wsp.AddTrafficPackage(sub.ID, plan.Traffic, sub.ExpireAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to add traffic package: %w", err)
	}
	// 更新工作空间配额，并在namespace上添加订阅标记的annotation: workspace.sealos.io/status=subscription
	if err := wsp.updateWorkspaceQuota(ctx, sub.Workspace, tx.NewPlanName); err != nil {
		return fmt.Errorf("failed to update workspace quota: %w", err)
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	return dbTx.Save(tx).Error
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
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.Add(addPeriod)
	plan, err := wsp.AccountV2.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	// TODO 创建流量包
	if err = wsp.AddTrafficPackage(sub.ID, plan.Traffic, sub.ExpireAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
		return fmt.Errorf("failed to add traffic package: %w", err)
	}

	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}

	// 更新工作空间配额
	if err := wsp.updateWorkspaceQuota(ctx, sub.Workspace, tx.NewPlanName); err != nil {
		return err
	}

	// 注意：工作空间订阅不需要处理积分

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = time.Now().UTC()
	return dbTx.Save(tx).Error
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
	if ok, err := wsp.checkWorkspaceQuotaConditions(ctx, sub.Workspace, sub.RegionDomain, tx.NewPlanName); err != nil {
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
	sub.Status = types.SubscriptionStatusNormal
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.Add(addPeriod)

	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update workspace subscription: %w", err)
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	if err := dbTx.Save(tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// 更新工作空间配额
	return wsp.updateWorkspaceQuota(ctx, sub.Workspace, tx.NewPlanName)
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
	if sub.ExpireAt.Before(now) {
		sub.StartAt = now
		sub.ExpireAt = now.Add(addPeriod)
	} else {
		sub.ExpireAt = sub.ExpireAt.Add(addPeriod)
	}
	plan, err := wsp.AccountV2.GetWorkspaceSubscriptionPlan(sub.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	if err = wsp.AddTrafficPackage(sub.ID, plan.Traffic, sub.ExpireAt, types.WorkspaceTrafficFromWorkspaceSubscription, tx.ID.String()); err != nil {
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

// checkWorkspaceDowngradeConditions 检查工作空间降级条件
// TODO: 需要后续实现具体的降级条件检查逻辑
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceDowngradeConditions(_ context.Context, subscription *types.WorkspaceSubscription, newPlanName string) (bool, error) {
	// TODO: 实现工作空间降级条件检查逻辑
	// 例如：检查工作空间内的资源使用情况是否满足新计划的限制
	// wsp.Logger.Info("Checking workspace downgrade conditions",
	//	"workspace", subscription.Workspace,
	//	"region", subscription.RegionDomain,
	//	"currentPlan", subscription.PlanName,
	//	"targetPlan", newPlanName)

	// 临时返回 true，实际实现时需要根据具体业务逻辑进行检查
	return true, nil
}

// checkWorkspaceQuotaConditions 检查工作空间配额条件
// TODO: 需要后续实现具体的配额条件检查逻辑
func (wsp *WorkspaceSubscriptionProcessor) checkWorkspaceQuotaConditions(_ context.Context, workspace, regionDomain, planName string) (bool, error) {
	// TODO: 实现工作空间配额条件检查逻辑
	// 例如：检查工作空间的资源使用是否超出新计划的限制
	// wsp.Logger.Info("Checking workspace quota conditions",
	//	"workspace", workspace,
	//	"region", regionDomain,
	//	"planName", planName)

	// 临时返回 true，实际实现时需要根据具体业务逻辑进行检查
	return true, nil
}
