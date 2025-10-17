package controllers

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	notificationv1 "github.com/labring/sealos/controllers/pkg/notification/api/v1"
	"github.com/labring/sealos/controllers/pkg/types"
	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"
	"gorm.io/gorm"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	types2 "k8s.io/apimachinery/pkg/types"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

// WorkspaceSubscriptionDebtProcessor 工作空间订阅债务处理器
type WorkspaceSubscriptionDebtProcessor struct {
	*AccountReconciler
	db           *gorm.DB
	pollInterval time.Duration
	wg           sync.WaitGroup
	stopChan     chan struct{}
}

// 债务状态定义
const (
	WorkspaceSubscriptionExpireAnnoKey = "workspace.sealos.io/expire-time"

	// 通知相关常量
	workspaceDebtNoticePrefix = "workspace-debt-"
	workspaceFromEn           = "Workspace-Subscription-System"
	workspaceFromZh           = "工作空间订阅系统"
)

// 债务处理的时间节点（单位：小时）
const (
	ExpiredGracePeriodHours  = 7 * 24  // 过期后开始暂停服务
	FinalDeletionPeriodHours = 14 * 24 // 过期后7天进行最终删除
)

// 通知模板映射
var workspaceNoticeTemplateENMap = map[types.SubscriptionStatus]string{
	types.SubscriptionStatusDebt:              "Your workspace has been suspended due to expired subscription. Please renew immediately.",
	types.SubscriptionStatusDebtPreDeletion:   "Your workspace will be permanently deleted soon due to expired subscription. Please renew immediately to avoid data loss.",
	types.SubscriptionStatusDebtFinalDeletion: "Your workspace will be permanently deleted soon due to expired subscription. Please renew immediately to avoid data loss.",
}

var workspaceNoticeTemplateZHMap = map[types.SubscriptionStatus]string{
	types.SubscriptionStatusDebt:              "您的工作空间订阅已过期，请及时续费以继续使用服务。",
	types.SubscriptionStatusDebtPreDeletion:   "由于订阅过期，您的工作空间即将被永久删除，请立即续费以避免数据丢失。",
	types.SubscriptionStatusDebtFinalDeletion: "由于订阅过期，您的工作空间即将被永久删除，请立即续费以避免数据丢失。",
}

var workspaceTitleTemplateENMap = map[types.SubscriptionStatus]string{
	types.SubscriptionStatusDebt:              "Workspace Suspended",
	types.SubscriptionStatusDebtPreDeletion:   "Workspace Final Deletion Warning",
	types.SubscriptionStatusDebtFinalDeletion: "Workspace Final Deletion Warning",
}

var workspaceTitleTemplateZHMap = map[types.SubscriptionStatus]string{
	types.SubscriptionStatusDebt:              "工作空间订阅已过期",
	types.SubscriptionStatusDebtPreDeletion:   "工作空间已暂停",
	types.SubscriptionStatusDebtFinalDeletion: "工作空间最终删除警告",
}

// NewWorkspaceSubscriptionDebtProcessor 创建工作空间订阅债务处理器
func NewWorkspaceSubscriptionDebtProcessor(
	reconciler *AccountReconciler,
) *WorkspaceSubscriptionDebtProcessor {
	return &WorkspaceSubscriptionDebtProcessor{
		AccountReconciler: reconciler,
		db:                reconciler.AccountV2.GetGlobalDB(),
		pollInterval:      1 * time.Minute,
		stopChan:          make(chan struct{}),
	}
}

// Start 启动债务处理器
func (wdp *WorkspaceSubscriptionDebtProcessor) Start(ctx context.Context) {
	wdp.wg.Add(1)
	go func() {
		defer wdp.wg.Done()
		ticker := time.NewTicker(wdp.pollInterval)
		defer ticker.Stop()

		idleCount := 0
		for {
			select {
			case <-ctx.Done():
				return
			case <-wdp.stopChan:
				return
			case <-ticker.C:
				count, err := wdp.processExpiredWorkspaces(ctx)
				if err != nil {
					log.Printf("Failed to process expired workspace subscriptions: %v", err)
				}

				// 动态调整检查间隔
				if count == 0 {
					idleCount++
					if idleCount > 10 { // 10次空闲后增加间隔
						ticker.Reset(wdp.pollInterval * 2)
					}
				} else {
					idleCount = 0
					ticker.Reset(wdp.pollInterval)
				}
			}
		}
	}()
}

// Stop 停止债务处理器
func (wdp *WorkspaceSubscriptionDebtProcessor) Stop() {
	close(wdp.stopChan)
	wdp.wg.Wait()
}

func (wdp *WorkspaceSubscriptionDebtProcessor) determineCurrentStatus(
	expireTime time.Time,
) types.SubscriptionStatus {
	now := time.Now().UTC()
	if expireTime.After(now) {
		return types.SubscriptionStatusNormal
	}
	expiredDuration := now.Sub(expireTime)
	if expiredDuration.Hours() < ExpiredGracePeriodHours {
		return types.SubscriptionStatusDebt
	} else if expiredDuration.Hours() < FinalDeletionPeriodHours {
		return types.SubscriptionStatusDebtPreDeletion
	}
	return types.SubscriptionStatusDebtFinalDeletion
}

// processExpiredWorkspaces 处理过期的工作空间
func (wdp *WorkspaceSubscriptionDebtProcessor) processExpiredWorkspaces(
	ctx context.Context,
) (int, error) {
	now := time.Now().UTC()
	processedCount := 0

	// Query 1: Subscriptions with a status of Normal and that have expired
	var normalExpiredSubscriptions []types.WorkspaceSubscription
	err := wdp.db.WithContext(ctx).Model(&types.WorkspaceSubscription{}).
		Where("region_domain = ? AND current_period_end_at < ? AND status = ?",
			wdp.localDomain,
			now,
			types.SubscriptionStatusNormal).
		Find(&normalExpiredSubscriptions).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query normal expired workspace subscriptions: %w", err)
	}

	// Query 2: Subscriptions whose status is Debt and whose expiration time exceeds ExpiredGracePeriodHours
	expiredDebtThreshold := now.Add(-time.Duration(ExpiredGracePeriodHours) * time.Hour)
	var debtExpiredSubscriptions []types.WorkspaceSubscription
	err = wdp.db.WithContext(ctx).Model(&types.WorkspaceSubscription{}).
		Where("region_domain = ? AND current_period_end_at < ? AND status = ?",
			wdp.localDomain,
			expiredDebtThreshold,
			types.SubscriptionStatusDebt).
		Find(&debtExpiredSubscriptions).Error
	if err != nil {
		return 0, fmt.Errorf("failed to query debt expired workspace subscriptions: %w", err)
	}

	// Query 3: Subscriptions whose status is DebtPreDeletion and whose expiration time exceeds FinalDeletionPeriodHours
	finalDeletionThreshold := now.Add(-time.Duration(FinalDeletionPeriodHours) * time.Hour)
	var preDeletionExpiredSubscriptions []types.WorkspaceSubscription
	err = wdp.db.WithContext(ctx).Model(&types.WorkspaceSubscription{}).
		Where("region_domain = ? AND current_period_end_at < ? AND status = ?",
			wdp.localDomain,
			finalDeletionThreshold,
			types.SubscriptionStatusDebtPreDeletion).
		Find(&preDeletionExpiredSubscriptions).Error
	if err != nil {
		return 0, fmt.Errorf(
			"failed to query pre-deletion expired workspace subscriptions: %w",
			err,
		)
	}

	subscriptions := append(
		append(normalExpiredSubscriptions, debtExpiredSubscriptions...),
		preDeletionExpiredSubscriptions...)

	for i := range subscriptions {
		if subscriptions[i].Status == types.SubscriptionStatusDeleted {
			continue // 已删除的订阅跳过
		}
		subscription := &subscriptions[i]

		// 判断当前应该处于的状态
		currentStatus := wdp.determineCurrentStatus(subscription.CurrentPeriodEndAt)
		if currentStatus == subscription.Status {
			continue // 状态未变化，跳过
		}

		// 处理状态变更
		if err := wdp.processExpiredWorkspace(ctx, subscription, now); err != nil {
			wdp.Logger.Error(fmt.Errorf("failed to process workspace: %w", err),
				"", "workspace", subscription.Workspace)
			continue
		}
		processedCount++
	}

	return processedCount, nil
}

// processExpiredWorkspace 处理单个过期的工作空间
func (wdp *WorkspaceSubscriptionDebtProcessor) processExpiredWorkspace(
	ctx context.Context,
	subscription *types.WorkspaceSubscription,
	now time.Time,
) error {
	currentStatus, lastStatus := wdp.determineCurrentStatus(now), subscription.Status
	if lastStatus == currentStatus {
		return nil
	}
	wdp.Logger.Info("Processing workspace subscription",
		"workspace", subscription.Workspace,
		"region", subscription.RegionDomain,
		"expiredAt", subscription.CurrentPeriodEndAt,
		"status", subscription.Status, "currentStatus", currentStatus)

	wdp.Logger.Info("Workspace debt status change detected",
		"workspace", subscription.Workspace,
		"lastStatus", lastStatus,
		"currentStatus", currentStatus)

	// 处理工作空间债务状态
	return wdp.flushWorkspaceDebtStatus(ctx, subscription, lastStatus, currentStatus)
}

// flushWorkspaceDebtStatus 处理工作空间债务状态变更
func (wdp *WorkspaceSubscriptionDebtProcessor) flushWorkspaceDebtStatus(
	ctx context.Context,
	subscription *types.WorkspaceSubscription,
	lastDebtStatus,
	currentDebtStatus types.SubscriptionStatus,
) error {
	namespaces := []string{subscription.Workspace}

	// 获取namespace状态，如果是删除中则跳过
	ns := &corev1.Namespace{}
	if err := wdp.Get(ctx, types2.NamespacedName{Name: subscription.Workspace}, ns); err != nil &&
		!apierrors.IsNotFound(err) {
		return fmt.Errorf("failed to get namespace %s: %w", subscription.Workspace, err)
	} else if apierrors.IsNotFound(err) || ns.DeletionTimestamp != nil || ns.Status.Phase == corev1.NamespaceTerminating {
		if subscription.CreateAt.After(time.Now().Add(-24 * time.Hour)) {
			wdp.Logger.Info("Namespace not found or terminating, but subscription is new, skip", "namespace", subscription.Workspace, "currentStatus", currentDebtStatus)
			return nil
		}
		// currentDebtStatus = types.SubscriptionStatusDeleted
		wdp.Logger.Info("Namespace is terminating, set to Deleted", "namespace", subscription.Workspace, "currentStatus", currentDebtStatus)
		return wdp.updateSubscriptionStatus(ctx, subscription, types.SubscriptionStatusDeleted)
	}

	userUID := subscription.UserUID
	nr, err := wdp.AccountV2.GetNotificationRecipient(subscription.UserUID)
	if err != nil {
		// logrus.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
		wdp.VLogger.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
	}
	wdp.UserContactProvider.SetUserContact(userUID, nr)
	defer wdp.UserContactProvider.RemoveUserContact(userUID)

	eventData := &usernotify.WorkspaceSubscriptionDebtEventData{
		Type:          usernotify.EventTypeWorkspaceSubscriptionDebt,
		PlanName:      subscription.PlanName,
		LastStatus:    lastDebtStatus,
		CurrentStatus: currentDebtStatus,
		DebtDays:      7,
		RegionDomain:  subscription.RegionDomain,
		WorkspaceName: subscription.Workspace,
		ExpirationDate: fmt.Sprintf(
			"%s-%s",
			subscription.CurrentPeriodStartAt.Format(time.DateOnly),
			subscription.CurrentPeriodEndAt.Format(time.DateOnly),
		),
	}

	// 根据债务状态进行处理
	switch currentDebtStatus {
	case types.SubscriptionStatusDebt:
		// 过期状态：发送通知，且暂停服务
		if err := wdp.sendWorkspaceDesktopNotice(ctx, currentDebtStatus, namespaces); err != nil {
			return fmt.Errorf("send workspace desktop notice error: %w", err)
		}

		// 更新工作空间状态
		if err := wdp.updateWorkspaceDebtStatus(ctx, types.SuspendDebtNamespaceAnnoStatus, namespaces); err != nil {
			return fmt.Errorf("update workspace debt status error: %w", err)
		}
		if _, err = wdp.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, eventData, types.SubscriptionTransactionTypeDebt, []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
			wdp.VLogger.Errorf(
				"failed to send subscription success notification for user %s: %v",
				userUID,
				err,
			)
			// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
		}

	case types.SubscriptionStatusDebtPreDeletion:
		if err := wdp.sendWorkspaceDesktopNotice(ctx, currentDebtStatus, namespaces); err != nil {
			return fmt.Errorf("send workspace desktop notice error: %w", err)
		}

		if err := wdp.updateWorkspaceDebtStatus(ctx, types.SuspendDebtNamespaceAnnoStatus, namespaces); err != nil {
			return fmt.Errorf("suspend workspace service error: %w", err)
		}

	case types.SubscriptionStatusDebtFinalDeletion:
		if err := wdp.sendWorkspaceDesktopNotice(ctx, currentDebtStatus, namespaces); err != nil {
			return fmt.Errorf("send workspace desktop notice error: %w", err)
		}

		if err := wdp.updateWorkspaceDebtStatus(ctx, types.FinalDeletionDebtNamespaceAnnoStatus, namespaces); err != nil {
			return fmt.Errorf("update workspace final deletion status error: %w", err)
		}
	}

	if err := wdp.readWorkspaceNotices(ctx, namespaces, wdp.getWorkspaceStatusesGreaterThan(currentDebtStatus)...); err != nil {
		return fmt.Errorf("read workspace notices error: %w", err)
	}
	if err := wdp.updateSubscriptionStatus(ctx, subscription, currentDebtStatus); err != nil {
		return fmt.Errorf("update subscription status error: %w", err)
	}

	return nil
}

// updateSubscriptionStatus 更新订阅状态
func (wdp *WorkspaceSubscriptionDebtProcessor) updateSubscriptionStatus(
	ctx context.Context,
	subscription *types.WorkspaceSubscription,
	status types.SubscriptionStatus,
) error {
	return wdp.db.WithContext(ctx).
		Debug().
		Model(&types.WorkspaceSubscription{}).
		Where("id = ?", subscription.ID).
		Update("status", status).
		Error
}

// updateWorkspaceDebtStatus 更新工作空间债务状态
func (wdp *WorkspaceSubscriptionDebtProcessor) updateWorkspaceDebtStatus(
	ctx context.Context,
	status string,
	namespaces []string,
) error {
	for _, nsName := range namespaces {
		ns := &corev1.Namespace{}
		if err := wdp.Get(ctx, types2.NamespacedName{Name: nsName}, ns); err != nil {
			return fmt.Errorf("failed to get namespace %s: %w", nsName, err)
		}

		if ns.Annotations == nil {
			ns.Annotations = make(map[string]string)
		}

		// 检查是否需要更新
		if ns.Annotations[types.DebtNamespaceAnnoStatusKey] == status ||
			ns.Annotations[types.DebtNamespaceAnnoStatusKey] == status+"Completed" {
			if ns.Annotations[types.WorkspaceSubscriptionStatusAnnoKey] == status {
				continue
			}
		} else {
			ns.Annotations[types.DebtNamespaceAnnoStatusKey] = status
		}

		original := ns.DeepCopy()
		ns.Annotations[types.WorkspaceSubscriptionStatusAnnoKey] = status
		ns.Annotations[types.WorkspaceSubscriptionStatusUpdateTimeAnnoKey] = time.Now().
			Format(time.RFC3339)

		if err := wdp.Patch(ctx, ns, client.MergeFrom(original)); err != nil {
			return fmt.Errorf("patch workspace namespace annotation failed: %w", err)
		}
	}
	return nil
}

// sendWorkspaceDesktopNotice 发送工作空间桌面通知
func (wdp *WorkspaceSubscriptionDebtProcessor) sendWorkspaceDesktopNotice(
	ctx context.Context,
	debtStatus types.SubscriptionStatus,
	namespaces []string,
) error {
	now := time.Now().UTC().Unix()
	ntfTmp := &notificationv1.Notification{
		ObjectMeta: metav1.ObjectMeta{
			Name: workspaceDebtNoticePrefix + strings.ToLower(string(debtStatus)),
		},
	}

	ntfTmpSpc := notificationv1.NotificationSpec{
		Title:        workspaceTitleTemplateENMap[debtStatus],
		Message:      workspaceNoticeTemplateENMap[debtStatus],
		From:         workspaceFromEn,
		Importance:   notificationv1.High,
		DesktopPopup: true,
		Timestamp:    now,
		I18n: map[string]notificationv1.I18n{
			"zh": {
				Title:   workspaceTitleTemplateZHMap[debtStatus],
				From:    workspaceFromZh,
				Message: workspaceNoticeTemplateZHMap[debtStatus],
			},
		},
	}

	for _, nsName := range namespaces {
		ntf := ntfTmp.DeepCopy()
		ntfSpec := ntfTmpSpc.DeepCopy()
		ntf.Namespace = nsName

		if _, err := controllerutil.CreateOrUpdate(ctx, wdp.Client, ntf, func() error {
			ntf.Spec = *ntfSpec
			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			}
			ntf.Labels["isRead"] = "false"
			return nil
		}); err != nil {
			return fmt.Errorf("failed to create or update workspace notification: %w", err)
		}
	}
	return nil
}

// readWorkspaceNotices 标记工作空间通知为已读
func (wdp *WorkspaceSubscriptionDebtProcessor) readWorkspaceNotices(
	ctx context.Context,
	namespaces []string,
	noticeTypes ...types.SubscriptionStatus,
) error {
	for _, nsName := range namespaces {
		for _, noticeStatus := range noticeTypes {
			ntf := &notificationv1.Notification{}
			notificationName := workspaceDebtNoticePrefix + strings.ToLower(string(noticeStatus))

			if err := wdp.Get(ctx, types2.NamespacedName{
				Name:      notificationName,
				Namespace: nsName,
			}, ntf); client.IgnoreNotFound(err) != nil {
				return fmt.Errorf("failed to get workspace notification: %w", err)
			} else if err != nil {
				continue
			}

			if ntf.Labels == nil {
				ntf.Labels = make(map[string]string)
			} else if ntf.Labels["isRead"] == trueStatus {
				continue
			}

			ntf.Labels["isRead"] = trueStatus
			if err := wdp.Update(ctx, ntf); err != nil {
				return fmt.Errorf("failed to update workspace notification read status: %w", err)
			}
		}
	}
	return nil
}

// getWorkspaceStatusesGreaterThan 获取比当前状态级别更高的所有状态
func (wdp *WorkspaceSubscriptionDebtProcessor) getWorkspaceStatusesGreaterThan(
	currentStatus types.SubscriptionStatus,
) []types.SubscriptionStatus {
	// 定义状态优先级映射
	statusPriority := map[types.SubscriptionStatus]int{
		types.SubscriptionStatusDebt:              0,
		types.SubscriptionStatusDebtPreDeletion:   1,
		types.SubscriptionStatusDebtFinalDeletion: 2,
	}

	currentPriority := statusPriority[currentStatus]
	var higherStatuses []types.SubscriptionStatus

	for status, priority := range statusPriority {
		if priority > currentPriority {
			higherStatuses = append(higherStatuses, status)
		}
	}

	return higherStatuses
}
