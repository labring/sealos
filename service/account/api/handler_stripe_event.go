package api

import (
	"context"
	"errors"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	services "github.com/labring/sealos/service/pkg/pay"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"github.com/stripe/stripe-go/v82"
	stripesubscription "github.com/stripe/stripe-go/v82/subscription"
	"gorm.io/gorm"
)

// handleWorkspaceSubscriptionInvoicePaid
func handleWorkspaceSubscriptionInvoicePaid(event *stripe.Event) error {
	// 1. parse event data early return
	invoice, subscription, err := parseAndValidateEvent(event)
	if err != nil {
		return err
	}

	// 2. check local events early return
	if ok, err := isLocalEvent(subscription); err != nil {
		return err
	} else if !ok {
		return nil
	}
	logrus.Infof("Processing invoice payment for subscription: %s", subscription.ID)

	// 3. For 100% discount case, wait for invoice metadata to be set
	// This handles the race condition where invoice.paid webhook arrives
	// before CreateUpgradeInvoice has a chance to update invoice metadata
	if invoice.AmountPaid == 0 && invoice.BillingReason == "subscription_update" {
		invoice, err = waitForInvoiceMetadata(invoice.ID)
		if err != nil {
			return fmt.Errorf("failed to wait for invoice metadata: %w", err)
		}
	}

	// 4. extract and verify the metadata
	meta, err := extractAndValidateMetadata(invoice, subscription)
	if err != nil {
		return err
	}
	userUID, err := uuid.Parse(meta.UserUID)
	if err != nil {
		return fmt.Errorf("invalid user UID in metadata: %w", err)
	}

	// 5. obtain the notification recipient
	nr, err := getNotificationRecipient(userUID)
	if err != nil {
		dao.Logger.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
	}
	defer dao.UserContactProvider.RemoveUserContact(userUID)

	// 6. handle it according to the billing reason branch
	switch {
	case invoice.BillingReason == "subscription_update" && meta.Operator != types.SubscriptionTransactionTypeCreated:
		meta.PaymentID = "" // 清空 PaymentID，避免混淆
		return handleSubscriptionUpdate(invoice, subscription, meta, userUID, nr)
	case invoice.BillingReason == "subscription_create" || invoice.BillingReason == "subscription_cycle" || meta.Operator == types.SubscriptionTransactionTypeCreated:
		return handleSubscriptionCreateOrRenew(
			invoice,
			subscription,
			meta,
			userUID,
			nr,
			invoice.BillingReason == "subscription_create",
		)
	default:
		return fmt.Errorf("unsupported billing reason: %s, meta: %#+v", invoice.BillingReason, meta)
	}
}

// parseAndValidateEvent
func parseAndValidateEvent(event *stripe.Event) (*stripe.Invoice, *stripe.Subscription, error) {
	sessionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to parse webhook data: %w", err)
	}

	invoice, ok := sessionData.(*stripe.Invoice)
	if !ok {
		return nil, nil, errors.New("invalid session data type")
	}
	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil ||
		invoice.Parent.SubscriptionDetails.Subscription == nil {
		return nil, nil, errors.New("invoice has no associated subscription")
	}

	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
	subscription, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get Stripe subscription: %w", err)
	}

	return invoice, subscription, nil
}

// waitForInvoiceMetadata polls the invoice until metadata is set or timeout occurs
// This handles the race condition in 100% discount cases where invoice.paid webhook
// arrives before CreateUpgradeInvoice updates the invoice metadata
func waitForInvoiceMetadata(invoiceID string) (*stripe.Invoice, error) {
	const (
		maxAttempts  = 10                     // Maximum number of polling attempts
		initialDelay = 100 * time.Millisecond // Initial delay between polls
		maxDelay     = 500 * time.Millisecond // Maximum delay between polls
		timeout      = 5 * time.Second        // Overall timeout
	)

	startTime := time.Now()
	delay := initialDelay

	logrus.Infof("Waiting for invoice metadata (100%% discount case): invoice=%s", invoiceID)

	for attempt := range maxAttempts {
		// Check timeout
		if time.Since(startTime) > timeout {
			return nil, fmt.Errorf("timeout waiting for invoice metadata after %v", timeout)
		}

		// Fetch fresh invoice from Stripe
		inv, err := services.StripeServiceInstance.GetInvoice(invoiceID)
		if err != nil {
			return nil, fmt.Errorf("failed to get invoice: %w", err)
		}

		// Check if critical metadata fields are present
		hasMetadata := inv.Metadata["subscription_operator"] != "" &&
			inv.Metadata["new_plan_name"] != "" &&
			inv.Metadata["payment_id"] != ""

		if hasMetadata {
			logrus.Infof(
				"Invoice metadata found after %d attempts (invoice=%s)",
				attempt+1,
				invoiceID,
			)
			return inv, nil
		}

		// Log waiting status
		logrus.Debugf(
			"Waiting for invoice metadata, attempt %d/%d (invoice=%s, has_operator=%v, has_plan=%v, has_payment=%v)",
			attempt+1,
			maxAttempts,
			invoiceID,
			inv.Metadata["subscription_operator"] != "",
			inv.Metadata["new_plan_name"] != "",
			inv.Metadata["payment_id"] != "",
		)

		// Wait before next poll with exponential backoff
		time.Sleep(delay)

		// Increase delay for next attempt (exponential backoff)
		delay = time.Duration(float64(delay) * 1.5)
		if delay > maxDelay {
			delay = maxDelay
		}
	}

	return nil, fmt.Errorf(
		"invoice metadata not set after %d attempts (invoice=%s)",
		maxAttempts,
		invoiceID,
	)
}

// isLocalEvent
func isLocalEvent(subscription *stripe.Subscription) (bool, error) {
	isLocal, err := checkIsLocalEvent(subscription) // 原函数
	if err != nil {
		return false, fmt.Errorf("failed to check event region: %w", err)
	}
	return isLocal, nil
}

// extractAndValidateMetadata 从 invoice 和 subscription 获取元数据
func extractAndValidateMetadata(
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
) (*subscriptionMetadata, error) {
	meta := &subscriptionMetadata{}

	// 先从 subscription 获取基本 metadata
	meta.Workspace = subscription.Metadata["workspace"]
	meta.RegionDomain = subscription.Metadata["region_domain"]
	meta.UserUID = subscription.Metadata["user_uid"]
	meta.NewPlanName = subscription.Metadata["plan_name"]
	meta.PaymentID = subscription.Metadata["payment_id"]
	meta.Operator = types.SubscriptionOperator(subscription.Metadata["subscription_operator"])
	meta.TransactionID = subscription.Metadata["transaction_id"]

	// 1. When creating a subscription, the metadata is on the Subscription
	// 2. when upgrading the metadata is on the invoice
	if invoice.Metadata["workspace"] != "" {
		meta.Workspace = invoice.Metadata["workspace"]
	}
	if invoice.Metadata["region_domain"] != "" {
		meta.RegionDomain = invoice.Metadata["region_domain"]
	}
	if invoice.Metadata["user_uid"] != "" {
		meta.UserUID = invoice.Metadata["user_uid"]
	}
	if invoice.Metadata["new_plan_name"] != "" {
		meta.NewPlanName = invoice.Metadata["new_plan_name"]
	} else if invoice.Metadata["plan_name"] != "" {
		meta.NewPlanName = invoice.Metadata["plan_name"]
	}
	if invoice.Metadata["payment_id"] != "" {
		meta.PaymentID = invoice.Metadata["payment_id"]
	}
	if invoice.Metadata["subscription_operator"] != "" {
		meta.Operator = types.SubscriptionOperator(invoice.Metadata["subscription_operator"])
	}
	if invoice.Metadata["transaction_id"] != "" {
		meta.TransactionID = invoice.Metadata["transaction_id"]
	}

	customer, err := ensureCustomerMetadata(subscription, meta.UserUID)
	if err != nil {
		return nil, err
	}
	meta.Customer = customer

	if meta.Workspace == "" || meta.RegionDomain == "" || meta.UserUID == "" ||
		meta.NewPlanName == "" {
		return nil, fmt.Errorf(
			"missing required metadata in invoice=%v or subscription=%v",
			invoice.Metadata, subscription.Metadata,
		)
	}

	return meta, nil
}

// updateSubscriptionMetadata updates the subscription metadata with enriched data
func updateSubscriptionMetadata(subscriptionID string, meta *subscriptionMetadata) error {
	params := &stripe.SubscriptionParams{
		Metadata: map[string]string{},
	}

	// Only set non-empty fields
	if meta.PaymentID != "" {
		params.Metadata["payment_id"] = meta.PaymentID
	}
	if meta.NewPlanName != "" {
		params.Metadata["plan_name"] = meta.NewPlanName
	}
	if meta.Operator != "" {
		params.Metadata["subscription_operator"] = string(meta.Operator)
	}
	if meta.Workspace != "" {
		params.Metadata["workspace"] = meta.Workspace
	}
	if meta.RegionDomain != "" {
		params.Metadata["region_domain"] = meta.RegionDomain
	}
	if meta.UserUID != "" {
		params.Metadata["user_uid"] = meta.UserUID
	}
	if meta.TransactionID != "" {
		params.Metadata["transaction_id"] = meta.TransactionID
	}

	// Add timestamp
	params.Metadata["updated_at"] = time.Now().Format(time.RFC3339)

	_, err := stripesubscription.Update(subscriptionID, params)
	return err
}

// subscriptionMetadata 辅助结构体：封装元数据
type subscriptionMetadata struct {
	Workspace     string
	RegionDomain  string
	UserUID       string
	NewPlanName   string
	PaymentID     string
	Operator      types.SubscriptionOperator
	TransactionID string
	Customer      *stripe.Customer // 从 ensureCustomerMetadata 获取
}

// ensureCustomerMetadata
func ensureCustomerMetadata(
	subscription *stripe.Subscription,
	userUID string,
) (*stripe.Customer, error) {
	custormer, err := services.StripeServiceInstance.GetCustomerByUID(userUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get customer by user UID %s: %w", userUID, err)
	}
	if custormer == nil || custormer.Metadata == nil || custormer.Metadata["user_uid"] == "" {
		if subscription.Customer != nil && subscription.Customer.ID != "" {
			if err := services.StripeServiceInstance.SetCustomerMetadata(subscription.Customer.ID, map[string]string{
				"user_uid": userUID,
			}); err != nil {
				return nil, fmt.Errorf(
					"failed to set customer metadata for user UID %s: %w",
					userUID,
					err,
				)
			}
			// 重新获取更新后的客户
			custormer, _ = services.StripeServiceInstance.GetCustomerByUID(userUID) // 忽略 err，已处理
		} else {
			return nil, fmt.Errorf("customer ID mismatch or customer not found for user UID %s", userUID)
		}
	}
	return custormer, nil
}

// getNotificationRecipient
func getNotificationRecipient(userUID uuid.UUID) (*types.NotificationRecipient, error) {
	nr, err := dao.DBClient.GetNotificationRecipient(userUID)
	if err != nil {
		return nil, err
	}
	dao.UserContactProvider.SetUserContact(userUID, nr)
	return nr, nil
}

// handleSubscriptionUpdate
func handleSubscriptionUpdate(
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
	meta *subscriptionMetadata,
	userUID uuid.UUID,
	nr *types.NotificationRecipient,
) error {
	wsTransaction, paymentID, err := prepareUpdateTransaction(invoice, subscription, meta)
	if err != nil {
		return err
	}

	payment, err := preparePayment(paymentID, invoice, subscription, meta, true) // true 表示升级
	if err != nil {
		return fmt.Errorf("failed to prepare upgrade payment: %w", err)
	}
	sub, err := getWorkspaceSubscription(meta.Workspace, meta.RegionDomain)
	if err != nil {
		return err
	}

	if err := dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Check if there's a PaymentOrder to convert
		var paymentOrder types.PaymentOrder
		if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
			// Convert PaymentOrder to Payment
			payment.Status = types.PaymentStatusPAID
			payment.Amount = invoice.AmountPaid * 10_000
			payment.TradeNO = invoice.ID
			payment.Stripe = &types.StripePay{
				SubscriptionID: subscription.ID,
				CustomerID:     subscription.Customer.ID,
				InvoiceID:      invoice.ID,
			}
		}

		return finalizeWorkspaceSubscriptionSuccess(tx, sub, wsTransaction, &payment)
	}); err != nil {
		return fmt.Errorf("failed to finalize upgrade payment: %w", err)
	}

	if err := sendUpgradeNotification(nr, userUID, wsTransaction, sub, invoice); err != nil {
		dao.Logger.Errorf("failed to send upgrade notification for user %s: %v", userUID, err)
	}
	// Finalize upgrade invoice - this must be done before processing the payment
	// This ensures the subscription is properly updated with the new plan
	logrus.Infof("Finalizing upgrade invoice: %s", invoice.ID)
	if err := services.StripeServiceInstance.FinalizeUpgradeInvoice(invoice.ID); err != nil {
		return fmt.Errorf("failed to finalize upgrade invoice: %w", err)
	}
	// Update subscription metadata with enriched data after successful processing
	if err := updateSubscriptionMetadata(subscription.ID, meta); err != nil {
		return fmt.Errorf("failed to update subscription metadata: %w", err)
	}

	logrus.Infof(
		"Successfully processed upgrade payment for %s/%s",
		meta.Workspace,
		meta.RegionDomain,
	)
	return nil
}

// prepareUpdateTransaction
func prepareUpdateTransaction(
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
	meta *subscriptionMetadata,
) (*types.WorkspaceSubscriptionTransaction, string, error) {
	var wsTransaction types.WorkspaceSubscriptionTransaction
	paymentID := meta.PaymentID

	switch meta.Operator {
	case types.SubscriptionTransactionTypeUpgraded:
		// For upgrade operations, try to get payment_id from various sources
		if paymentID == "" {
			paymentID = subscription.Metadata["last_payment_id"]
		}
		if paymentID == "" {
			paymentID = invoice.Metadata["payment_id"]
		}
		if paymentID == "" {
			return nil, "", errors.New("missing payment_id for upgrade subscription")
		}

		// First try to find the transaction
		if err := dao.DBClient.GetGlobalDB().Model(&types.WorkspaceSubscriptionTransaction{}).Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
			return nil, "", fmt.Errorf("failed to get upgrade transaction: %w", err)
		}

		// Check if there's a PaymentOrder for this upgrade
		var paymentOrder types.PaymentOrder
		if err := dao.DBClient.GetGlobalDB().Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
			// PaymentOrder exists, this is the new invoice-based upgrade flow
			if paymentOrder.Stripe != nil && paymentOrder.Stripe.InvoiceID != "" {
				// Update PaymentOrder with the subscription ID if not already set
				if paymentOrder.Stripe.SubscriptionID == "" {
					paymentOrder.Stripe.SubscriptionID = subscription.ID
					paymentOrder.Stripe.CustomerID = subscription.Customer.ID
					dao.DBClient.GetGlobalDB().Save(&paymentOrder)
				}
			}
		}

	case types.SubscriptionTransactionTypeDowngraded:
		if meta.TransactionID == "" {
			return nil, "", errors.New("missing transaction_id for downgrade subscription")
		}
		if err := dao.DBClient.GetGlobalDB().Where("id = ?", meta.TransactionID).First(&wsTransaction).Error; err != nil {
			return nil, "", fmt.Errorf("failed to get downgrade transaction: %w", err)
		}
	default:
		return nil, "", fmt.Errorf(
			"unsupported operator for subscription update: %s",
			meta.Operator,
		)
	}

	ws, err := getWorkspaceSubscription(meta.Workspace, meta.RegionDomain)
	if err != nil {
		return nil, "", err
	}
	if ws == nil {
		return nil, "", fmt.Errorf(
			"workspace subscription not found for upgrade: %s/%s",
			meta.Workspace,
			meta.RegionDomain,
		)
	}

	return &wsTransaction, paymentID, nil
}

// handleSubscriptionCreateOrRenew
func handleSubscriptionCreateOrRenew(
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
	meta *subscriptionMetadata,
	userUID uuid.UUID,
	nr *types.NotificationRecipient,
	isInitial bool,
) error {
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		wsTransaction, payment := prepareCreateOrRenewTransactionAndPayment(
			tx,
			invoice,
			subscription,
			meta,
			userUID,
			isInitial,
		)
		if wsTransaction == nil || payment.ID == "" {
			return errors.New("failed to prepare transaction or payment")
		}

		ws, err := getWorkspaceSubscription(meta.Workspace, meta.RegionDomain)
		if err != nil {
			return err
		}
		if ws != nil {
			payment.WorkspaceSubscriptionID = &ws.ID
			if isInitial && ws.Status == types.SubscriptionStatusDeleted {
				if _, err := services.StripeServiceInstance.CancelSubscription(subscription.ID); err != nil {
					return fmt.Errorf(
						"failed to cancel subscription for deleted workspace: %w",
						err,
					)
				}
				dao.Logger.Infof(
					"subscription paid for deleted workspace %s/%s, subscription %s canceled",
					meta.Workspace,
					meta.RegionDomain,
					subscription.ID,
				)
				return nil
			}
			ws.CurrentPeriodStartAt = time.Now().UTC()
			ws.CurrentPeriodEndAt = time.Now().UTC().AddDate(0, 1, 0)
		}

		// if isInitial {
		//	if err := deletePaymentOrder(tx, payment.ID); err != nil {
		//		return err
		//	}
		//}

		if err := finalizeWorkspaceSubscriptionSuccess(tx, ws, wsTransaction, &payment); err != nil {
			return err
		}

		if err := sendNotification(nr, userUID, wsTransaction, ws, meta.Operator, invoice); err != nil {
			dao.Logger.Errorf(
				"failed to send subscription success notification for user %s: %v",
				userUID,
				err,
			)
		}

		logrus.Infof(
			"Successfully processed workspace subscription %s for %s/%s",
			invoice.BillingReason,
			meta.Workspace,
			meta.RegionDomain,
		)
		return nil
	})
}

// prepareCreateOrRenewTransactionAndPayment
func prepareCreateOrRenewTransactionAndPayment(
	tx *gorm.DB,
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
	meta *subscriptionMetadata,
	userUID uuid.UUID,
	isInitial bool,
) (*types.WorkspaceSubscriptionTransaction, types.Payment) {
	var wsTransaction types.WorkspaceSubscriptionTransaction
	paymentID := meta.PaymentID

	if !isInitial {
		paymentID, _ = gonanoid.New(12) // 忽略 err，假设成功
	}

	if isInitial {
		if paymentID == "" {
			return nil, types.Payment{}
		}
		if err := tx.Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
			dao.Logger.Errorf("workspace subscription transaction not found: %v", err)
			return nil, types.Payment{}
		}
		wsTransaction.PayStatus = types.SubscriptionPayStatusPaid
	} else {
		wsTransaction = types.WorkspaceSubscriptionTransaction{
			ID:           uuid.New(),
			From:         types.TransactionFromUser,
			Workspace:    meta.Workspace,
			RegionDomain: meta.RegionDomain,
			UserUID:      userUID,
			NewPlanName:  meta.NewPlanName,
			Operator:     types.SubscriptionTransactionTypeRenewed,
			StartAt:      time.Now().UTC(),
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
			PayStatus:    types.SubscriptionPayStatusPaid,
			PayID:        paymentID,
			Period:       types.SubscriptionPeriodMonthly,
			Amount:       invoice.AmountPaid * 10_000,
		}
		ws, err := getWorkspaceSubscription(meta.Workspace, meta.RegionDomain)
		if err != nil {
			return nil, types.Payment{}
		}
		if ws != nil {
			wsTransaction.OldPlanName = ws.PlanName
			wsTransaction.OldPlanStatus = ws.Status
		}
	}

	payment := types.Payment{
		ID: paymentID,
		PaymentRaw: types.PaymentRaw{
			Stripe: &types.StripePay{
				SubscriptionID: subscription.ID,
				InvoiceID:      invoice.ID,
				CustomerID:     subscription.Customer.ID,
			},
			UserUID:      userUID,
			RegionUID:    dao.DBClient.GetLocalRegion().UID,
			CreatedAt:    time.Now().UTC(),
			Method:       helper.STRIPE,
			Amount:       invoice.AmountPaid * 10_000,
			TradeNO:      invoice.ID,
			Type:         types.PaymentTypeSubscription,
			ChargeSource: types.ChargeSourceStripe,
			Status:       types.PaymentStatusPAID,
			Message: fmt.Sprintf(
				"Payment for workspace %s/%s (%s)",
				meta.Workspace,
				meta.RegionDomain,
				invoice.BillingReason,
			),
		},
	}

	return &wsTransaction, payment
}

// getWorkspaceSubscription
func getWorkspaceSubscription(
	workspace, regionDomain string,
) (*types.WorkspaceSubscription, error) {
	ws, err := dao.DBClient.GetWorkspaceSubscription(workspace, regionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to get workspace subscription: %w", err)
	}
	return ws, nil
}

// deletePaymentOrder
func deletePaymentOrder(tx *gorm.DB, paymentID string) error {
	var paymentOrder types.PaymentOrder
	if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
		return tx.Delete(&paymentOrder).Error
	}
	return nil
}

// preparePayment
func preparePayment(
	paymentID string,
	invoice *stripe.Invoice,
	subscription *stripe.Subscription,
	meta *subscriptionMetadata,
	_ bool,
) (types.Payment, error) {
	wsSubscriptionID := (*uuid.UUID)(nil)
	ws, err := getWorkspaceSubscription(meta.Workspace, meta.RegionDomain)
	if err != nil {
		return types.Payment{}, err
	}
	if ws != nil {
		id := ws.ID
		wsSubscriptionID = &id
	}

	return types.Payment{
		ID: paymentID,
		PaymentRaw: types.PaymentRaw{
			Stripe: &types.StripePay{
				SubscriptionID: subscription.ID,
				CustomerID:     subscription.Customer.ID,
			},
			UserUID:                 uuid.MustParse(meta.UserUID), // 假设已验证
			RegionUID:               dao.DBClient.GetLocalRegion().UID,
			CreatedAt:               time.Now().UTC(),
			Method:                  helper.STRIPE,
			Amount:                  invoice.AmountPaid * 10_000,
			TradeNO:                 invoice.ID,
			Type:                    types.PaymentTypeSubscription,
			ChargeSource:            types.ChargeSourceStripe,
			Status:                  types.PaymentStatusPAID,
			WorkspaceSubscriptionID: wsSubscriptionID,
			Message: fmt.Sprintf(
				"Upgrade payment for workspace %s/%s (%s)",
				meta.Workspace,
				meta.RegionDomain,
				invoice.BillingReason,
			), // 可根据 isUpgrade 调整
		},
	}, nil
}

// sendUpgradeNotification
func sendUpgradeNotification(
	nr *types.NotificationRecipient,
	userUID uuid.UUID,
	wsTransaction *types.WorkspaceSubscriptionTransaction,
	ws *types.WorkspaceSubscription,
	invoice *stripe.Invoice,
) error {
	if nr == nil {
		return nil
	}
	return sendNotification(
		nr,
		userUID,
		wsTransaction,
		ws,
		types.SubscriptionTransactionTypeUpgraded,
		invoice,
	)
}

// sendNotification
func sendNotification(
	nr *types.NotificationRecipient,
	userUID uuid.UUID,
	wsTransaction *types.WorkspaceSubscriptionTransaction,
	ws *types.WorkspaceSubscription,
	operator types.SubscriptionOperator,
	invoice *stripe.Invoice,
) error {
	if nr == nil {
		return nil
	}

	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(wsTransaction.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	features, err := types.ParseMaxResource(plan.MaxResources, plan.Traffic)
	if err != nil {
		return fmt.Errorf("failed to parse plan features: %w", err)
	}

	eventData := &usernotify.WorkspaceSubscriptionEventData{
		WorkspaceName: wsTransaction.Workspace,
		Operator:      operator,
		Domain:        wsTransaction.RegionDomain,
		RegionDomain:  wsTransaction.RegionDomain,
		PayStatus:     types.SubscriptionPayStatusPaid,
		OldPlanName:   wsTransaction.OldPlanName,
		NewPlanName:   wsTransaction.NewPlanName,
		Features:      features,
		Amount:        math.Ceil(float64(invoice.AmountPaid)/float64(100)) * 1_000_000,
	}

	if ws != nil {
		eventData.ExpirationDate = fmt.Sprintf("%s - %s",
			ws.CurrentPeriodStartAt.Format("2006.1.2"),
			ws.CurrentPeriodEndAt.Format("2006.1.2"))
		eventData.NextPayDate = ws.CurrentPeriodEndAt.Format(time.DateOnly)
	} else {
		now := time.Now().UTC()
		eventData.ExpirationDate = fmt.Sprintf("%s - %s",
			now.Format("2006.1.2"),
			now.AddDate(0, 1, 0).Format("2006.1.2"))
		eventData.NextPayDate = now.AddDate(0, 0, 30).Format(time.DateOnly)
	}

	switch operator {
	case types.SubscriptionTransactionTypeCreated,
		types.SubscriptionTransactionTypeUpgraded,
		types.SubscriptionTransactionTypeRenewed:
		_, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(
			context.Background(),
			userUID,
			eventData,
			operator,
			[]usernotify.NotificationMethod{usernotify.NotificationMethodEmail},
		)
		return err
	default:
		logrus.Errorf("unsupported subscription operator: %s", operator)
		return nil
	}
}
