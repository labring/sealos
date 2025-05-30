package api

import (
	"context"
	"fmt"
	"time"

	"github.com/labring/sealos/service/account/helper"

	services "github.com/labring/sealos/service/pkg/pay"

	"github.com/google/uuid"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
)

const (
	// ExpirationReminderDays 订阅到期前多少天开始提醒
	ExpirationReminderDays = 7
	// PollingInterval 轮询间隔
	PollingInterval = 1 * time.Hour
	// LockTimeout 分布式锁超时时间
	LockTimeout = 10 * time.Minute
	// BatchSize 处理批次大小
	BatchSize = 100
)

// SubscriptionProcessor 处理订阅到期和自动续费
type SubscriptionProcessor struct {
	db *gorm.DB
}

// NewSubscriptionProcessor 创建订阅处理器
func NewSubscriptionProcessor(db *gorm.DB) *SubscriptionProcessor {
	return &SubscriptionProcessor{
		db: db,
	}
}

// StartProcessing 开始处理订阅
func (p *SubscriptionProcessor) StartProcessing(ctx context.Context) {
	logrus.Info("Starting subscription expiration processor")

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	// 立即执行一次，然后按照间隔定期执行
	p.processSubscriptions()

	for {
		select {
		case <-ticker.C:
			p.processSubscriptions()
		case <-ctx.Done():
			logrus.Info("Stopping subscription expiration processor")
			return
		}
	}
}

// StartKYCProcessing 开始处理 KYC
func (p *SubscriptionProcessor) StartKYCProcessing(ctx context.Context) {
	logrus.Info("Starting KYC processor")

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	p.ProcessKYCCredits()
	for {
		select {
		case <-ticker.C:
			p.ProcessKYCCredits()
		case <-ctx.Done():
			logrus.Info("Stopping KYC processor")
			return
		}
	}
}

func (p *SubscriptionProcessor) StartFlushQuotaProcessing(ctx context.Context) {
	logrus.Info("Starting flush quota processor")

	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	err := dao.FlushQuotaProcesser.Execute()
	if err != nil {
		logrus.Errorf("Failed to execute flush quota task: %v", err)
	}

	for {
		select {
		case <-ticker.C:
			err := dao.FlushQuotaProcesser.Execute()
			if err != nil {
				logrus.Errorf("Failed to execute flush quota task: %v", err)
			}
		case <-ctx.Done():
			logrus.Info("Stopping flush quota processor")
			return
		}
	}
}

// acquireProcessingLock 获取分布式锁
func (p *SubscriptionProcessor) acquireProcessingLock(lockID string) (bool, error) {
	// 使用数据库实现分布式锁
	// 这里使用一个简单的表来实现锁机制
	var result struct {
		Acquired bool
	}

	err := p.db.Raw(`
		INSERT INTO subscription_processor_locks (id, lock_until)
		VALUES (?, ?)
		ON CONFLICT (id) DO UPDATE
		SET lock_until = EXCLUDED.lock_until
		WHERE subscription_processor_locks.lock_until < NOW()
		RETURNING true as acquired
	`, lockID, time.Now().UTC().Add(LockTimeout)).Scan(&result).Error

	if err != nil {
		return false, err
	}

	return result.Acquired, nil
}

// releaseProcessingLock 释放分布式锁
func (p *SubscriptionProcessor) releaseProcessingLock(lockID string) error {
	return p.db.Exec(`
		UPDATE subscription_processor_locks
		SET lock_until = NOW()
		WHERE id = ?
	`, lockID).Error
}

// processExpiredSubscriptions 处理已过期的订阅
func (p *SubscriptionProcessor) processExpiredSubscriptions() error {
	logrus.Info("Processing expired subscriptions")

	// find subscriptions that have expired
	var expiredSubscriptions []types.Subscription

	err := p.db.Transaction(func(tx *gorm.DB) error {
		// 查找已过期但状态仍为正常的订阅
		return tx.Raw(`
			SELECT s.* FROM "Subscription" s
			WHERE s.expire_at < ?AND s.status = ?
			AND s.plan_name != ?
			LIMIT ?
		`, time.Now().UTC().Add(10*time.Minute), types.SubscriptionStatusNormal, types.FreeSubscriptionPlanName, BatchSize).Scan(&expiredSubscriptions).Error
	})

	if err != nil {
		return fmt.Errorf("failed to query expired subscriptions: %w", err)
	}

	logrus.Infof("Found %d expired subscriptions", len(expiredSubscriptions))

	// process each expired subscription
	for _, subscription := range expiredSubscriptions {
		logrus.Infof("Renewal subscription plan: %v", subscription)
		var userStatus types.UserStatus
		err = p.db.Model(&types.User{}).Where(&types.User{UID: subscription.UserUID}).Select("status").Scan(&userStatus).Error
		if err != nil {
			logrus.Errorf("Failed to get user status for subscription %s: %v", subscription.ID, err)
			continue
		}
		if userStatus != types.UserStatusNormal {
			logrus.Infof("User %s is not NORMAL_USER, skipping subscription %s", subscription.UserUID, subscription.ID)
			p.db.Model(&types.Subscription{}).Where(&types.Subscription{ID: subscription.ID}).Update("status", userStatus)
			continue
		}
		//TODO transaction operation:
		// 1. Create a renewal subscription transaction for an expiring subscription
		// 2. Automatically renew payment by binding cardID (create payment order, manage transaction PayID, initiate tied card payment, deduct payment by balance if card payment fails, and change payment information to ChargeSourceBalance)
		// 3. Notification of successful renewal and information on the source of deduction
		// 4. Renewal failure to send a payment failure notification
		// 5. Change the subscription transaction pay_status
		// 6. The specific updating of the subscription table is handled by another controller and is not required here
		if err := p.HandlerSubscriptionTransaction(&subscription); err != nil {
			logrus.Errorf("Failed to process subscription %s: %v", subscription.ID, err)
		}
	}
	return nil
}

func (p *SubscriptionProcessor) HandlerSubscriptionTransaction(subscription *types.Subscription) error {
	subPlan, err := dao.DBClient.GetSubscriptionPlan(subscription.PlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}

	// TODO Gets a subscription transaction record and skips if there are already unprocessed renewal transactions

	subTransaction := types.SubscriptionTransaction{
		ID:             uuid.New(),
		SubscriptionID: subscription.ID,
		UserUID:        subscription.UserUID,
		OldPlanID:      subPlan.ID,
		OldPlanName:    subPlan.Name,
		OldPlanStatus:  subscription.Status,
		StartAt:        time.Now().UTC(),
		NewPlanID:      subPlan.ID,
		NewPlanName:    subPlan.Name,
		Amount:         subPlan.Amount,
		Operator:       types.SubscriptionTransactionTypeRenewed,
		CreatedAt:      time.Now().UTC(),
		Status:         types.SubscriptionTransactionStatusProcessing,
	}

	//TODO if free subscription, determine whether to bind github account. If bound, renewal subscription; otherwise, the status changes to Debt
	if subscription.PlanName == types.FreeSubscriptionPlanName && subscription.Status == types.SubscriptionStatusNormal {
		// TODO 待删除逻辑
		//ok, err := HasGithubOauthProvider(p.db, subscription.UserUID)
		//if err != nil {
		//	return fmt.Errorf("failed to check github oauth provider: %w", err)
		//}
		//if ok {
		//	subTransaction.PayStatus = types.SubscriptionPayStatusNoNeed
		//	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		//		return tx.Create(&subTransaction).Error
		//	})
		//	if err != nil {
		//		return fmt.Errorf("failed to create subscription transaction: %w", err)
		//	}
		//} else {
		//	subscription.Status = types.SubscriptionStatusDebt
		//	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		//		return tx.Model(&types.Subscription{}).Where(&types.Subscription{ID: subscription.ID}).Update("status", types.SubscriptionStatusDebt).Error
		//	})
		//	if err != nil {
		//		return fmt.Errorf("failed to update subscription status: %w", err)
		//	}
		//}
		return nil
	}

	//TODO card binding payment
	if subscription.CardID != nil {
		paymentReq := services.PaymentRequest{
			RequestID:     uuid.NewString(),
			UserUID:       subTransaction.UserUID,
			Amount:        subTransaction.Amount,
			Currency:      dao.PaymentCurrency,
			UserAgent:     "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
			ClientIP:      dao.ClientIP,
			DeviceTokenID: dao.DeviceTokenID,
		}
		err = SubscriptionPayForBindCard(paymentReq, &helper.SubscriptionOperatorReq{
			AuthBase:  helper.AuthBase{Auth: &helper.Auth{UserUID: subTransaction.UserUID}},
			CardID:    subscription.CardID,
			PayMethod: "CARD",
		}, &subTransaction)
		if err == nil {
			if err = sendUserSubPayEmailWith(subscription.UserUID); err != nil {
				logrus.Errorf("Failed to send subscription success email: %v", err)
			}
			return nil
		}
		logrus.Errorf("Failed to pay for bind card: %v, subscription: %v", err, subscription)
	}

	// if card payment fails, deduct payment by balance
	if err = SubscriptionPayByBalance(&helper.SubscriptionOperatorReq{
		AuthBase: helper.AuthBase{Auth: &helper.Auth{UserUID: subTransaction.UserUID}},
	}, &subTransaction); err == nil {
		return nil
	}
	logrus.Errorf("Failed to pay by balance: %v, subscription: %v", err, subscription)

	//TODO Send a subscription failure notification

	if err := p.sendRenewalFailureNotification(subscription, subTransaction); err != nil {
		logrus.Errorf("Failed to send renewal failure notification for subscription %s: %v",
			subscription.ID, err)
	}
	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		subTransaction.Status = types.SubscriptionTransactionStatusFailed
		subTransaction.PayStatus = types.SubscriptionPayStatusFailed
		subscription.Status = types.SubscriptionStatusDebt
		dErr := tx.Create(&subTransaction).Error
		if dErr != nil {
			return fmt.Errorf("failed to create subscription transaction: %w", dErr)
		}
		return tx.Model(&types.Subscription{}).Where(&types.Subscription{ID: subscription.ID}).Update("status", types.SubscriptionStatusDebt).Error
	})
	if err != nil {
		return fmt.Errorf("failed to update subscription status: %w", err)
	}
	return nil
}

func InitSubscriptionProcessorTables(db *gorm.DB) error {
	// 创建处理器锁表
	err := db.Exec(`
		CREATE TABLE IF NOT EXISTS subscription_processor_locks (
			id TEXT PRIMARY KEY,
			lock_until TIMESTAMP WITH TIME ZONE NOT NULL
		)
	`).Error

	return err
}

// sendRenewalFailureNotification 发送续费失败通知
func (p *SubscriptionProcessor) sendRenewalFailureNotification(subscription *types.Subscription, transaction types.SubscriptionTransaction) error {
	//logrus.Infof("Sending renewal failure notification to user %s for subscription %s. Plan: %s, transaction ID: %s",
	//	subscription.UserUID, subscription.ID, subscription.PlanName, transaction.ID)
	//
	//// TODO: implement the actual notification logic
	//if err := SendUserPayEmail(subscription.UserUID, utils.EnvSubFailedEmailTmpl); err != nil {
	//	logrus.Errorf("Failed to send subscription success email: %v", err)
	//}

	return nil
}

func (p *SubscriptionProcessor) processSubscriptions() {
	logrus.Info("Processing subscriptions")

	// 获取分布式锁
	lockID := "subscription_processor"
	acquired, err := p.acquireProcessingLock(lockID)
	if err != nil {
		logrus.Errorf("Failed to acquire processing lock: %v", err)
		return
	}

	if !acquired {
		logrus.Info("Another instance is currently processing subscriptions")
		return
	}

	defer func() {
		if err := p.releaseProcessingLock(lockID); err != nil {
			logrus.Errorf("Failed to release processing lock: %v", err)
		}
	}()
	if err = p.processExpiredSubscriptions(); err != nil {
		logrus.Errorf("Failed to process expired subscriptions: %v", err)
	}
}

//func (p *SubscriptionProcessor) ProcessKYCStatus() {
//	logrus.Info("Processing KYC")
//
//	// 获取分布式锁
//	lockID := "kyc_processor"
//	acquired, err := p.acquireProcessingLock(lockID)
//	if err != nil {
//		logrus.Errorf("Failed to acquire processing lock: %v", err)
//		return
//	}
//
//	if !acquired {
//		logrus.Info("Another instance is currently processing KYC")
//		return
//	}
//
//	defer func() {
//		if err := p.releaseProcessingLock(lockID); err != nil {
//			logrus.Errorf("Failed to release processing lock: %v", err)
//		}
//	}()
//
//	if err = p.processKYCStatus(); err != nil {
//		logrus.Errorf("Failed to process KYC: %v", err)
//	}
//}
//
//func (p *SubscriptionProcessor) processKYCStatus() error {
//	logrus.Info("Processing KYC status")
//
//	var users []types.UserKYC
//	err := p.db.Transaction(func(tx *gorm.DB) error {
//		return tx.Where("status = ?", types.UserKYCStatusPending).Find(&users).Error
//	})
//	if err != nil {
//		return fmt.Errorf("failed to query pending KYC: %w", err)
//	}
//
//	logrus.Infof("Found %d pending KYC", len(users))
//
//	for _, user := range users {
//		// If KYC is not processed within 30 days, the status is set to failed
//		if !user.CreatedAt.Add(30 * 24 * time.Hour).Before(time.Now()) {
//			dErr := p.db.Transaction(func(tx *gorm.DB) error {
//				return tx.Model(&types.UserKYC{}).Where("user_uid = ?", user.UserUID).Update("status", types.UserKYCStatusFailed).Error
//			})
//			if dErr != nil {
//				logrus.Errorf("Failed to update KYC status: %v", dErr)
//			}
//			continue
//		}
//
//		// If github is bound, set the KYC status to completed
//		err = p.db.Transaction(func(tx *gorm.DB) error {
//			bindCount := int64(0)
//			dErr := tx.Model(&types.OauthProvider{}).Where(`"userUid" = ? AND "providerType" = ?`, user.UserUID, types.OauthProviderTypeGithub).Count(&bindCount).Error
//			if dErr != nil {
//				return fmt.Errorf("failed to check github oauth provider: %w", dErr)
//			}
//			if bindCount == 0 {
//				return nil
//			}
//			return tx.Model(&types.UserKYC{}).Where("user_uid = ?", user.UserUID).Update("status", types.UserKYCStatusCompleted).Error
//		})
//		if err != nil {
//			logrus.Errorf("Failed to update KYC status: %v", err)
//		}
//	}
//	return nil
//}

func (p *SubscriptionProcessor) ProcessKYCCredits() {
	logrus.Info("Processing KYC credits")

	// 获取分布式锁
	lockID := "kyc_credits_processor"
	acquired, err := p.acquireProcessingLock(lockID)
	if err != nil {
		logrus.Errorf("Failed to acquire processing lock: %v", err)
		return
	}

	if !acquired {
		//logrus.Info("Another instance is currently processing KYC credits")
		return
	}

	defer func() {
		if err := p.releaseProcessingLock(lockID); err != nil {
			logrus.Errorf("Failed to release processing lock: %v", err)
		}
	}()

	if err = p.processKYCCredits(); err != nil {
		logrus.Errorf("Failed to process KYC credits: %v", err)
	}
}

func (p *SubscriptionProcessor) processKYCCredits() error {
	var users []types.UserKYC
	err := p.db.Transaction(func(tx *gorm.DB) error {
		return tx.Where("next_at < ? AND (status = ? OR status = ?)", time.Now().UTC().Add(10*time.Minute), types.UserKYCStatusPending, types.UserKYCStatusCompleted).Find(&users).Error
	})
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to query completed KYC: %w", err)
	}
	if len(users) == 0 {
		return nil
	}
	logrus.Infof("Found %d completed KYC", len(users))
	freePlan, err := dao.DBClient.GetSubscriptionPlan(types.FreeSubscriptionPlanName)
	if err != nil {
		return fmt.Errorf("failed to get subscription plan: %w", err)
	}

	for _, user := range users {
		err = p.db.Transaction(func(tx *gorm.DB) error {
			// If the status is Pending, check whether KYC has been completed
			if user.Status == types.UserKYCStatusPending {
				userInfo := &types.UserInfo{}
				dErr := dao.DBClient.GetGlobalDB().Model(&types.UserInfo{}).Where(`"userUid" = ?`, user.UserUID).Find(userInfo).Error
				if dErr != nil {
					return fmt.Errorf("failed to get user info: %w", dErr)
				}
				status := types.UserKYCStatusCompleted
				if userInfo.Config == nil {
					status = types.UserKYCStatusFailed
				} else {
					if userInfo.Config.Github.CreatedAt == "" {
						status = types.UserKYCStatusFailed
					} else {
						createAt, dErr := time.Parse(time.RFC3339, userInfo.Config.Github.CreatedAt)
						if dErr != nil {
							return fmt.Errorf("failed to parse github user created time: %w", dErr)
						}
						if createAt.AddDate(0, 0, 180).After(time.Now()) {
							status = types.UserKYCStatusFailed
						}
					}
				}

				// 判断创建时间是否为180天以前
				if status == types.UserKYCStatusFailed {
					return tx.Model(&types.UserKYC{}).Where("user_uid = ?", user.UserUID).Update("status", types.UserKYCStatusFailed).Error
				} else {
					return tx.Model(&types.UserKYC{}).Where("user_uid = ?", user.UserUID).Update("status", types.UserKYCStatusCompleted).Error
				}
			}
			// Obtain the integral records that are in the active state within normal time. If yes, change the status to failed and create a new one
			//dErr := tx.Model(&types.Credits{}).Where("user_uid = ? AND from_id = ? AND from_type = ? AND status = ? AND expire_at > ?", user.UserUID, freePlan.ID, types.CreditsFromTypeSubscription, types.CreditsStatusActive, time.Now().UTC()).Update("status", types.CreditsStatusExpired).Error
			//if dErr != nil && dErr != gorm.ErrRecordNotFound {
			//	return fmt.Errorf("failed to check credits: %w", dErr)
			//}
			now := time.Now().UTC()
			credits := &types.Credits{
				ID:         uuid.New(),
				UserUID:    user.UserUID,
				Amount:     freePlan.GiftAmount,
				UsedAmount: 0,
				FromID:     freePlan.ID.String(),
				FromType:   types.CreditsFromTypeSubscription,
				ExpireAt:   user.NextAt.AddDate(0, 1, 0),
				CreatedAt:  now,
				StartAt:    user.NextAt,
				Status:     types.CreditsStatusActive,
			}
			if dErr := tx.Create(credits).Error; dErr != nil {
				return fmt.Errorf("failed to create credits: %w", dErr)
			}
			return tx.Model(&types.UserKYC{}).Where("user_uid = ?", user.UserUID).Update("next_at", user.NextAt.AddDate(0, 1, 0)).Error
		})
		if err != nil {
			logrus.Errorf("Failed to update %#+v credits: %v", user, err)
		}
	}
	return nil
}
