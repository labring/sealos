package controllers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"gorm.io/gorm"
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
		pollInterval:      time.Second,
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
	err := sp.db.WithContext(ctx).Model(&types.SubscriptionTransaction{}).
		Where("pay_status IN (?, ?) AND start_at <= ? AND status NOT IN (?, ?)",
			types.SubscriptionPayStatusPaid,
			types.SubscriptionPayStatusNoNeed,
			now,
			types.SubscriptionTransactionStatusCompleted,
			types.SubscriptionTransactionStatusFailed).
		Find(&transactions).Error
	if err != nil {
		return fmt.Errorf("failed to query pending transactions: %w", err)
	}

	for i := range transactions {
		acc := &types.Account{}
		dErr := sp.db.Model(&types.Account{}).Where(&types.Account{UserUID: transactions[i].UserUID}).Find(acc).Error
		if dErr != nil {
			sp.Logger.Error(fmt.Errorf("failed to fetch account: %w", dErr), "", "user_uid", transactions[i].UserUID)
			continue
		}
		if acc.CreateRegionID != sp.AccountV2.GetLocalRegion().UID.String() {
			continue
		}
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

// If the account service network is too slow, can synchronize the database
//func (sp *SubscriptionProcessor) flushOtherDomainQuota(_ context.Context, userUID uuid.UUID) error {
//	var regionTaskList []*types.AccountRegionUserTask
//	for _, domain := range sp.allRegionDomain {
//		if domain == sp.localDomain {
//			continue
//		}
//		regionTaskList = append(regionTaskList, &types.AccountRegionUserTask{
//			UserUID:      userUID,
//			RegionDomain: domain,
//			Type:         types.AccountRegionUserTaskTypeFlushQuota,
//			StartAt:      time.Now().UTC(),
//			Status:       types.AccountRegionUserTaskStatusPending,
//		})
//	}
//	err := sp.AccountV2.GetGlobalDB().Transaction(func(tx *gorm.DB) error {
//		for _, task := range regionTaskList {
//			if err := tx.Create(task).Error; err != nil {
//				return err
//			}
//		}
//		return nil
//	})
//	if err != nil {
//		return fmt.Errorf("failed to create account region user task: %w", err)
//	}
//	return nil
//}

// updateQuota 更新用户的资源配额
func (sp *SubscriptionProcessor) updateQuota(_ context.Context, userUID, planID uuid.UUID, planName string) error {
	//if err := sp.flushOtherDomainQuota(ctx, userUID); err != nil {
	//	return fmt.Errorf("failed to flush other domain quota: %w", err)
	//}
	if err := sp.sendFlushQuotaRequest(userUID, planID, planName); err != nil {
		return fmt.Errorf("failed to send flush quota request: %w", err)
	}
	return nil
}

const AdminUserName = "sealos-admin"

type AdminFlushSubscriptionQuotaReq struct {
	UserUID  uuid.UUID `json:"userUID" bson:"userUID"`
	PlanName string    `json:"planName" bson:"planName"`
	PlanID   uuid.UUID `json:"planID" bson:"planID"`
}

// 延迟过高
func (sp *SubscriptionProcessor) sendFlushQuotaRequest(userUID, planID uuid.UUID, planName string) error {
	return sendFlushQuotaRequest(sp.allRegionDomain, sp.jwtManager, userUID, planID, planName)
}

func sendFlushQuotaRequest(allRegion []string, jwtManager *utils.JWTManager, userUID, planID uuid.UUID, planName string) error {
	for _, domain := range allRegion {
		token, err := jwtManager.GenerateToken(utils.JwtUser{
			Requester: AdminUserName,
		})
		if err != nil {
			return fmt.Errorf("failed to generate token: %w", err)
		}

		url := fmt.Sprintf("https://account-api.%s/admin/v1alpha1/flush-sub-quota", domain)

		quotaReq := AdminFlushSubscriptionQuotaReq{
			UserUID:  userUID,
			PlanID:   planID,
			PlanName: planName,
		}
		quotaReqBody, err := json.Marshal(quotaReq)
		if err != nil {
			return fmt.Errorf("failed to marshal request: %w", err)
		}

		var lastErr error
		backoffTime := time.Second

		maxRetries := 3
		for attempt := 1; attempt <= maxRetries; attempt++ {
			req, err := http.NewRequest("POST", url, bytes.NewBuffer(quotaReqBody))
			if err != nil {
				return fmt.Errorf("failed to create request: %w", err)
			}

			req.Header.Set("Authorization", "Bearer "+token)
			req.Header.Set("Content-Type", "application/json")
			client := http.Client{}

			resp, err := client.Do(req)
			if err != nil {
				lastErr = fmt.Errorf("failed to send request: %w", err)
			} else {
				defer resp.Body.Close()

				if resp.StatusCode == http.StatusOK {
					lastErr = nil
					break
				}
				body, err := io.ReadAll(resp.Body)
				if err != nil {
					lastErr = fmt.Errorf("unexpected status code: %d, failed to read response body: %w", resp.StatusCode, err)
				} else {
					lastErr = fmt.Errorf("unexpected status code: %d, response body: %s", resp.StatusCode, string(body))
				}
			}

			// 进行重试
			if attempt < maxRetries {
				fmt.Printf("Attempt %d failed: %v. Retrying in %v...\n", attempt, lastErr, backoffTime)
				time.Sleep(backoffTime)
				backoffTime *= 2 // 指数增长退避时间
			}
		}
		if lastErr != nil {
			return lastErr
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
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// 更新配额
	if err := sp.updateQuota(ctx, sub.UserUID, tx.NewPlanID, tx.NewPlanName); err != nil {
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
		FromID:    sub.PlanID.String(),
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
	now := time.Now()
	// 更新订阅信息
	sub.PlanID = tx.NewPlanID
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}

	// 更新配额
	if err := sp.updateQuota(ctx, sub.UserUID, tx.NewPlanID, tx.NewPlanName); err != nil {
		return err
	}

	err := dbTx.Model(&types.Credits{}).Where(&types.Credits{
		UserUID:  sub.UserUID,
		FromID:   tx.OldPlanID.String(),
		FromType: types.CreditsFromTypeSubscription,
	}).Where("expire_at > ? AND status = ?", now, types.CreditsStatusActive).Update("status", types.CreditsStatusExpired).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to update credits: %w", err)
	}
	// 更新积分
	plan, err := sp.AccountV2.GetSubscriptionPlan(tx.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}
	var credits = types.Credits{
		UserUID:   sub.UserUID,
		FromType:  types.CreditsFromTypeSubscription,
		FromID:    sub.PlanID.String(),
		Status:    types.CreditsStatusActive,
		Amount:    plan.GiftAmount,
		ExpireAt:  sub.NextCycleDate,
		CreatedAt: now,
		StartAt:   now,
	}
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
	if ok, err := sp.checkDowngradeConditions(ctx, &sub, tx.NewPlanID); err != nil {
		return fmt.Errorf("failed to check downgrade conditions: %w", err)
	} else if !ok {
		tx.Status = types.SubscriptionTransactionStatusFailed
		return dbTx.Save(tx).Error
	}
	if ok, err := sp.checkQuotaConditions(ctx, sub.UserUID, tx.NewPlanID, tx.NewPlanName); err != nil {
		return fmt.Errorf("failed to check quota conditions: %w", err)
	} else if !ok {
		tx.Status = types.SubscriptionTransactionStatusFailed
		return dbTx.Save(tx).Error
	}

	now := time.Now()
	sub.PlanID = tx.NewPlanID
	sub.PlanName = tx.NewPlanName
	sub.Status = types.SubscriptionStatusNormal
	sub.StartAt = now
	sub.UpdateAt = now
	sub.ExpireAt = now.AddDate(0, 1, 0)
	sub.NextCycleDate = sub.ExpireAt
	if err := dbTx.Save(&sub).Error; err != nil {
		return fmt.Errorf("failed to update subscription: %w", err)
	}
	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	if err := dbTx.Save(tx).Error; err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}
	// 更新配额
	return sp.updateQuota(ctx, sub.UserUID, tx.NewPlanID, tx.NewPlanName)
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
	sub.StartAt = now
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
	if plan.GiftAmount > 0 {
		// 过期之前的 credits
		err := dbTx.Model(&types.Credits{}).Where(&types.Credits{
			UserUID:  sub.UserUID,
			FromID:   sub.PlanID.String(),
			FromType: types.CreditsFromTypeSubscription,
		}).Update("status", types.CreditsStatusExpired).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return fmt.Errorf("failed to update credits: %w", err)
		}
		if err := cockroach.CreateCredits(dbTx, &types.Credits{
			UserUID:   sub.UserUID,
			Amount:    plan.GiftAmount,
			FromID:    sub.PlanID.String(),
			FromType:  types.CreditsFromTypeSubscription,
			ExpireAt:  sub.NextCycleDate,
			CreatedAt: now,
			StartAt:   now,
			Status:    types.CreditsStatusActive,
		}); err != nil {
			return fmt.Errorf("failed to create credits: %w", err)
		}
	}

	tx.Status = types.SubscriptionTransactionStatusCompleted
	tx.UpdatedAt = now
	return dbTx.Save(tx).Error
}

// checkDowngradeConditions 检查降级条件
func (sp *SubscriptionProcessor) checkDowngradeConditions(_ context.Context, subscription *types.Subscription, planID uuid.UUID) (bool, error) {
	// //TODO: 检查 disk、namespace、seat 等条件
	token, err := sp.desktopJwtManager.GenerateToken(utils.JwtUser{
		UserUID:   subscription.UserUID,
		RegionUID: sp.AccountV2.GetLocalRegion().UID.String(),
	})
	if err != nil {
		return false, fmt.Errorf("failed to generate token: %w", err)
	}

	url := "http://desktop-frontend.sealos.svc.cluster.local:3000/api/v1alpha/downGrade/check"

	var lastErr error
	backoffTime := time.Second

	maxRetries := 3
	for attempt := 1; attempt <= maxRetries; attempt++ {
		req, err := http.NewRequest("POST", url, bytes.NewBuffer([]byte(fmt.Sprintf(`{"subscriptionPlanId": "%s"}`, planID))))
		if err != nil {
			return false, fmt.Errorf("failed to create request: %w", err)
		}

		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")

		client := http.Client{
			Timeout: 10 * time.Minute,
		}

		resp, err := client.Do(req)
		if err != nil {
			lastErr = fmt.Errorf("failed to send request: %w", err)
		} else {
			defer resp.Body.Close()

			// 读取响应
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return false, fmt.Errorf("failed to read response: %w", err)
			} else if resp.StatusCode == http.StatusOK {
				var response APIResponse
				if err = json.Unmarshal(body, &response); err != nil {
					return false, fmt.Errorf("failed to unmarshal response: %w", err)
				}
				if response.Code != 200 {
					return false, fmt.Errorf("response code is not 200: %v", response)
				}
				return response.Data.AllWorkspaceReady && response.Data.SeatReady, nil
			} else if resp.StatusCode >= 500 {
				lastErr = fmt.Errorf("unexpected status code: %d; %s", resp.StatusCode, string(body))
			} else {
				return false, fmt.Errorf("client error: %d; %s", resp.StatusCode, string(body))
			}
		}

		// 进行重试
		if attempt < maxRetries {
			fmt.Printf("Attempt %d failed: %v. Retrying in %v...\n", attempt, lastErr, backoffTime)
			time.Sleep(backoffTime)
			backoffTime *= 2 // 指数增长退避时间
		}
	}
	return false, lastErr
}

type SubscriptionQuotaCheckReq struct {
	// @Summary PlanID
	// @Description PlanID
	PlanID uuid.UUID `json:"planID" bson:"planID" example:"123e4567-e89b-12d3-a456-426614174000"`

	// @Summary PlanName
	// @Description PlanName
	PlanName string `json:"planName" bson:"planName" example:"planName"`
}

type SubscriptionQuotaCheckResp struct {
	//allWorkspaceReady
	AllWorkspaceReady bool `json:"allWorkspaceReady" bson:"allWorkspaceReady" example:"true"`

	ReadyWorkspace []string `json:"readyWorkspace" bson:"readyWorkspace" example:"workspace1,workspace2"`

	UnReadyWorkspace []string `json:"unReadyWorkspace" bson:"unReadyWorkspace" example:"workspace3,workspace4"`
}

// checkDowngradeConditions 检查降级条件
func (sp *SubscriptionProcessor) checkQuotaConditions(_ context.Context, userUID, planID uuid.UUID, planName string) (bool, error) {
	for _, domain := range sp.allRegionDomain {
		token, err := sp.jwtManager.GenerateToken(utils.JwtUser{
			UserUID: userUID,
			//RegionUID: sp.AccountV2.GetLocalRegion().UID.String(),
		})
		if err != nil {
			return false, fmt.Errorf("failed to generate token: %w", err)
		}
		url := fmt.Sprintf("http://account-api.%s/payment/v1alpha1/subscription/quota-check", domain)
		quotaReq := SubscriptionQuotaCheckReq{
			PlanID:   planID,
			PlanName: planName,
		}
		quotaReqBody, err := json.Marshal(quotaReq)
		if err != nil {
			return false, fmt.Errorf("failed to marshal request: %w", err)
		}
		req, err := http.NewRequest("POST", url, bytes.NewBuffer(quotaReqBody))
		if err != nil {
			return false, fmt.Errorf("failed to create request: %w", err)
		}
		req.Header.Set("Authorization", token)
		req.Header.Set("Content-Type", "application/json")

		client := http.Client{
			Timeout: 10 * time.Minute,
		}
		resp, err := client.Do(req)
		if err != nil {
			return false, fmt.Errorf("failed to send request: %w", err)
		} else {
			defer resp.Body.Close()
			body, err := io.ReadAll(resp.Body)
			if err != nil {
				return false, fmt.Errorf("failed to read response: %w", err)
			} else if resp.StatusCode == http.StatusOK {
				var response SubscriptionQuotaCheckResp
				if err = json.Unmarshal(body, &response); err != nil {
					return false, fmt.Errorf("failed to unmarshal response: %w", err)
				}
				if !response.AllWorkspaceReady {
					return false, nil
				}
				continue
			}
			return false, fmt.Errorf("client error: %d; %s", resp.StatusCode, string(body))
		}
	}
	return true, nil
}

type APIResponse struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
	Data    Data   `json:"data"`
}

// Data 数据部分结构体
type Data struct {
	AllWorkspaceReady     bool                      `json:"allWorkspaceReady"`
	SeatReady             bool                      `json:"seatReady"`
	MaxWorkspace          int                       `json:"max_workspace"`
	MaxSeat               int                       `json:"max_seat"`
	GroupedWorkspaceUsage map[string]WorkspaceGroup `json:"groupedWorkspaceUsage"`
}

// WorkspaceGroup 工作空间组结构体
type WorkspaceGroup struct {
	Workspaces []Workspace `json:"workspaces"`
}

// Workspace 单个工作空间结构体
type Workspace struct {
	RegionUID    string `json:"regionUid"`
	WorkspaceUID string `json:"workspaceUid"`
	Seat         int    `json:"seat"`
}
