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

	ticker := time.NewTicker(PollingInterval)
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
	`, lockID, time.Now().Add(LockTimeout)).Scan(&result).Error

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
		`, time.Now(), types.SubscriptionStatusNormal,
			types.FreeSubscriptionPlanName, BatchSize).Scan(&expiredSubscriptions).Error
	})

	if err != nil {
		return fmt.Errorf("failed to query expired subscriptions: %w", err)
	}

	logrus.Infof("Found %d expired subscriptions", len(expiredSubscriptions))

	// process each expired subscription
	for _, subscription := range expiredSubscriptions {
		logrus.Infof("Renewal subscription plan: %v", subscription)

		//TODO transaction operation:
		// 1. Create a renewal subscription transaction for an expiring subscription
		// 2. Automatically renew payment by binding cardID (create payment order, manage transaction PayID, initiate tied card payment, deduct payment by balance if card payment fails, and change payment information to ChargeSourceBalance)
		// 3. Notification of successful renewal and information on the source of deduction
		// 4. Renewal failure to send a payment failure notification
		// 5. Change the subscription transaction pay_status
		// 6. The specific updating of the subscription table is handled by another controller and is not required here

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
			StartAt:        time.Now(),
			NewPlanID:      subPlan.ID,
			NewPlanName:    subPlan.Name,
			Amount:         subPlan.Amount,
			Operator:       types.SubscriptionTransactionTypeRenewed,
			CreatedAt:      time.Now(),
			Status:         types.SubscriptionTransactionStatusProcessing,
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
		// update the transaction status
		subscription.Status = types.SubscriptionStatusDebt
		err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
			return tx.Model(&types.Subscription{}).Where(&types.Subscription{ID: subscription.ID}).Update("status", types.SubscriptionStatusDebt).Error
		})
		if err != nil {
			return fmt.Errorf("failed to update subscription status: %w", err)
		}
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
func (p *SubscriptionProcessor) sendRenewalFailureNotification(subscription types.Subscription, transaction types.SubscriptionTransaction) error {
	logrus.Infof("Sending renewal failure notification to user %s for subscription %s. Plan: %s, transaction ID: %s",
		subscription.UserUID, subscription.ID, subscription.PlanName, transaction.ID)

	// TODO: implement the actual notification logic

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
