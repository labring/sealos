package api

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/labring/sealos/controllers/pkg/resources"

	usernotify "github.com/labring/sealos/controllers/pkg/user_notify"

	"sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"github.com/stripe/stripe-go/v82"
	"gorm.io/gorm"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	services "github.com/labring/sealos/service/pkg/pay"
)

// GetWorkspaceSubscriptionInfo
// @Summary Get workspace subscription info
// @Description Get workspace subscription info
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionInfoReq true "WorkspaceSubscriptionInfoReq"
// @Success 200 {object} WorkspaceSubscriptionInfoResp
// @Router /payment/v1alpha1/workspace-subscription/info [post]
func GetWorkspaceSubscriptionInfo(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionInfoReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	subscription, err := dao.DBClient.GetWorkspaceSubscription(req.Workspace, req.RegionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription info: %v", err)})
		return
	}
	const (
		WorkspaceTypeSubscription = "SUBSCRIPTION"
		WorkspaceTypePAYG         = "PAYG"
	)
	var workspaceSubInfo = struct {
		*types.WorkspaceSubscription
		Type string `json:"type"`
	}{
		WorkspaceSubscription: subscription,
		Type:                  WorkspaceTypeSubscription,
	}

	if subscription == nil {
		workspaceSubInfo.Type = WorkspaceTypePAYG
	}

	c.JSON(http.StatusOK, gin.H{
		"subscription": workspaceSubInfo,
	})
}

// DeleteWorkspaceSubscription
func DeleteWorkspaceSubscription(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionInfoReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	subscription, err := dao.DBClient.GetWorkspaceSubscription(req.Workspace, req.RegionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription info: %v", err)})
		return
	}
	if subscription == nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "no active subscription found"})
		return
	}
	if subscription.Status == types.SubscriptionStatusDeleted {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		if subscription.PayStatus == types.SubscriptionPayStatusPaid {
			if subscription.PayMethod == types.PaymentMethodStripe && subscription.Stripe.SubscriptionID != "" {
				if sub, err := services.StripeServiceInstance.CancelSubscription(subscription.Stripe.SubscriptionID); err != nil {
					if sub.Status != stripe.SubscriptionStatusCanceled {
						return err
					}
				}
			}
		}
		// TODO 更新订阅状态
		subscription.Status = types.SubscriptionStatusDeleted
		subscription.PayStatus = types.SubscriptionPayStatusCanceled
		tx.Save(&subscription)
		// TODO 创建交易记录
		transaction := types.WorkspaceSubscriptionTransaction{
			ID:            uuid.New(),
			From:          types.TransactionFromUser,
			Workspace:     req.Workspace,
			RegionDomain:  req.RegionDomain,
			UserUID:       req.UserUID,
			OldPlanName:   subscription.PlanName,
			OldPlanStatus: subscription.Status,
			NewPlanName:   subscription.PlanName,
			Operator:      types.SubscriptionTransactionTypeDeleted,
			StartAt:       time.Now().UTC(),
			CreatedAt:     time.Now().UTC(),
			Status:        types.SubscriptionTransactionStatusCompleted,
			PayStatus:     types.SubscriptionPayStatusNoNeed,
			StatusDesc:    "Canceled by user with stripe: %s" + subscription.Stripe.SubscriptionID,
		}
		if err = tx.Create(&transaction).Error; err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to delete workspace subscription: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

// GetWorkspaceSubscriptionList
// @Summary Get workspace subscription list
// @Description Get workspace subscription list
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionListReq true "WorkspaceSubscriptionListReq"
// @Success 200 {object} WorkspaceSubscriptionListResp
// @Router /payment/v1alpha1/workspace-subscription/list [post]
func GetWorkspaceSubscriptionList(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	subscriptions, err := dao.DBClient.ListWorkspaceSubscription(req.UserUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"subscriptions": subscriptions,
	})
}

// GetWorkspaceSubscriptionPaymentList
// @Summary Get workspace subscription payment list
// @Description Get workspace subscription payment list
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionInfoReq true "WorkspaceSubscriptionInfoReq"
// @Success 200 {object} WorkspaceSubscriptionPaymentListResp
// @Router /payment/v1alpha1/workspace-subscription/payment-list [post]
func GetWorkspaceSubscriptionPaymentList(c *gin.Context) {
	req, err := helper.ParseUserTimeRangeReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	type WorkspaceSubscriptionPayment struct {
		ID        string    `gorm:"column:id"`
		Time      time.Time `gorm:"column:time"`
		Amount    int64     `gorm:"column:amount"`
		PlanName  string    `gorm:"column:plan_name"`
		Workspace string    `gorm:"column:workspace"`
		Operator  string    `gorm:"column:operator"`
	}

	paymentType := types.PaymentTypeSubscription
	status := types.PaymentStatusPAID
	var payments []WorkspaceSubscriptionPayment

	// Query using GORM to join Payment and WorkspaceSubscriptionTransaction tables
	query := dao.DBClient.GetGlobalDB().
		Model(&types.Payment{}).
		Select(`"Payment".created_at AS time,
                "Payment".id AS id,
                "Payment".amount AS amount,
                "WorkspaceSubscriptionTransaction".new_plan_name AS plan_name,
				"WorkspaceSubscriptionTransaction".workspace AS workspace,
                "WorkspaceSubscriptionTransaction".operator AS operator`).
		Joins(`INNER JOIN "WorkspaceSubscriptionTransaction" ON "Payment".id = "WorkspaceSubscriptionTransaction".pay_id`).
		Where(`"Payment".type = ? AND "Payment".status = ?`, paymentType, status)

	// Add time range filter if StartTime and EndTime are valid
	if !req.TimeRange.StartTime.IsZero() && !req.TimeRange.EndTime.IsZero() {
		query = query.Where(`"Payment".created_at BETWEEN ? AND ?`, req.TimeRange.StartTime, req.TimeRange.EndTime)
	}

	err = query.Scan(&payments).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to query payments: %v", err)})
		return
	}
	if len(payments) == 0 {
		payments = make([]WorkspaceSubscriptionPayment, 0)
	}
	c.JSON(http.StatusOK, gin.H{
		"payments": payments,
	})
}

// GetWorkspaceSubscriptionPlanList
// @Summary Get workspace subscription plan list
// @Description Get workspace subscription plan list
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Success 200 {object} WorkspaceSubscriptionPlanListResp
// @Router /payment/v1alpha1/workspace-subscription/plan-list [post]
func GetWorkspaceSubscriptionPlanList(c *gin.Context) {
	plans, err := dao.DBClient.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription plan list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
	})
}

// GetLastWorkspaceSubscriptionTransaction
// @Summary Get last workspace subscription transaction
// @Description Get last workspace subscription transaction
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionInfoReq true "WorkspaceSubscriptionInfoReq"
// @Success 200 {object} WorkspaceSubscriptionLastTransactionResp
// @Router /payment/v1alpha1/workspace-subscription/last-transaction [post]
func GetLastWorkspaceSubscriptionTransaction(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionInfoReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	transaction, err := dao.DBClient.GetLastWorkspaceSubscriptionTransaction(req.Workspace, req.RegionDomain)
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get last workspace subscription transaction: %v", err)})
		return
	}
	if transaction == nil {
		transaction = &types.WorkspaceSubscriptionTransaction{}
	}
	c.JSON(http.StatusOK, gin.H{
		"transaction": transaction,
	})
}

// GetWorkspaceSubscriptionUpgradeAmount
// @Summary Get workspace subscription upgrade amount
// @Description Get workspace subscription upgrade amount
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionUpgradeAmountReq true "WorkspaceSubscriptionUpgradeAmountReq"
// @Success 200 {object} WorkspaceSubscriptionUpgradeAmountResp
// @Router /payment/v1alpha1/workspace-subscription/upgrade-amount [post]
func GetWorkspaceSubscriptionUpgradeAmount(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionOperatorReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	currentSubscription, err := dao.DBClient.GetWorkspaceSubscription(req.Workspace, req.RegionDomain)
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get current workspace subscription: %v", err)})
		return
	}

	if currentSubscription == nil || currentSubscription.PlanName == req.PlanName {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "plan name is same as current plan or no current subscription"})
		return
	}

	currentPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(currentSubscription.PlanName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get current plan: %v", err)})
		return
	}

	targetPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(req.PlanName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get target plan: %v", err)})
		return
	}

	// Calculate upgrade amount based on period
	var currentPrice, targetPrice int64
	for _, price := range currentPlan.Prices {
		if price.BillingCycle == req.Period {
			currentPrice = price.Price
			break
		}
	}
	for _, price := range targetPlan.Prices {
		if price.BillingCycle == req.Period {
			targetPrice = price.Price
			break
		}
	}

	if targetPrice <= currentPrice {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "target plan price is not higher than current plan"})
		return
	}

	// Calculate prorated amount based on usage
	alreadyUsedDays := time.Since(currentSubscription.CurrentPeriodStartAt).Hours() / 24
	periodDays := float64(30) // Default to monthly
	if req.Period == types.SubscriptionPeriodYearly {
		periodDays = 365
	}

	usedAmount := (periodDays - alreadyUsedDays) / periodDays * float64(currentPrice)
	amount := float64(targetPrice) - usedAmount

	c.JSON(http.StatusOK, gin.H{
		"amount": int64(amount),
	})
}

// CreateWorkspaceSubscriptionPay
// @Summary Create workspace subscription payment
// @Description Create workspace subscription payment with Stripe
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionOperatorReq true "WorkspaceSubscriptionOperatorReq"
// @Success 200 {object} WorkspaceSubscriptionPayResp
// @Router /payment/v1alpha1/workspace-subscription/pay [post]
func CreateWorkspaceSubscriptionPay(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionOperatorReq(c)
	if err != nil {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		SetErrorResp(c, http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// TODO Validate payment method，当前支付状态正常状态的 不允许创建新的支付，除非升级；当前状态异常的

	// Get current subscription (if exists)
	currentSubscription, err := dao.DBClient.GetWorkspaceSubscription(req.Workspace, req.RegionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get workspace subscription: %v", err)})
		return
	}

	// Validate plan changes
	if currentSubscription != nil && currentSubscription.PlanName == req.PlanName && req.Operator != types.SubscriptionTransactionTypeRenewed {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "plan name is same as current plan"})
		return
	}

	// Get target plan
	targetPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(req.PlanName)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get subscription plan: %v", err)})
		return
	}

	// Get all workspace subscription plans for validation
	planList, err := dao.DBClient.GetWorkspaceSubscriptionPlanList()
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get workspace subscription plan list: %v", err)})
		return
	}

	var currentPlan *types.WorkspaceSubscriptionPlan
	if currentSubscription != nil {
		for _, plan := range planList {
			if plan.Name == currentSubscription.PlanName {
				currentPlan = &plan
				break
			}
		}
	}

	// Find price for the specified period
	var planPrice *types.ProductPrice
	for _, price := range targetPlan.Prices {
		if string(price.BillingCycle) == string(req.Period) {
			planPrice = &price
			break
		}
	}
	if planPrice == nil {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "no price found for specified period"})
		return
	}
	//if currentSubscription.PlanName == types.FreeSubscriptionPlanName && req.Operator == types.SubscriptionTransactionTypeUpgraded {
	//	req.Operator = types.SubscriptionTransactionTypeCreated
	//}

	// Create subscription transaction with direct operator usage
	transaction := types.WorkspaceSubscriptionTransaction{
		ID:           uuid.New(),
		From:         types.TransactionFromUser,
		Workspace:    req.Workspace,
		RegionDomain: req.RegionDomain,
		UserUID:      req.UserUID,
		NewPlanName:  req.PlanName,
		Operator:     req.Operator, // Use operator directly from request
		StartAt:      time.Now().UTC(),
		CreatedAt:    time.Now().UTC(),
		Status:       types.SubscriptionTransactionStatusProcessing,
		Period:       req.Period,
		Amount:       planPrice.Price,
	}

	if currentSubscription != nil {
		transaction.OldPlanName = currentSubscription.PlanName
		transaction.OldPlanStatus = currentSubscription.Status
	}

	// Validate plan transitions and calculate pricing based on operator
	switch req.Operator {
	case types.SubscriptionTransactionTypeCreated:
		// No additional validation needed for creation
		if currentSubscription != nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot create new subscription with existing subscription"})
			return
		}
	case types.SubscriptionTransactionTypeUpgraded:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot upgrade without existing subscription"})
			return
		}
		if currentPlan != nil && !contain(currentPlan.UpgradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in upgrade plan list: %v", currentPlan.UpgradePlanList)})
			return
		}

		// Calculate upgrade pricing (similar to subscription logic)
		if currentPlan != nil {
			currentPlanPrice := getCurrentWorkspacePlanPrice(currentPlan, req.Period)
			if currentPlanPrice != nil && currentPlanPrice.Price > 0 {
				// Calculate prorated amount based on usage
				alreadyUsedDays := time.Since(currentSubscription.CurrentPeriodStartAt).Hours() / 24
				period, err := types.ParsePeriod(req.Period)
				if err != nil {
					SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("invalid period: %v", err)})
					return
				}
				periodDays := getPeriodDays(period)
				usedAmount := (periodDays - alreadyUsedDays) / periodDays * float64(currentPlanPrice.Price)
				value := float64(planPrice.Price) - usedAmount
				if value > 0 {
					transaction.Amount = int64(value)
				} else {
					transaction.Amount = 0
				}
			}
		}

	case types.SubscriptionTransactionTypeDowngraded:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot downgrade without existing subscription"})
			return
		}
		if currentPlan != nil && !contain(currentPlan.DowngradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in downgrade plan list: %v", currentPlan.DowngradePlanList)})
			return
		}
		// Downgrade takes effect at next cycle and typically has no cost
		if currentSubscription.CurrentPeriodEndAt.After(time.Now()) {
			transaction.StartAt = currentSubscription.CurrentPeriodEndAt.Add(-20 * time.Minute)
		}
		transaction.Status = types.SubscriptionTransactionStatusPending
		transaction.Amount = 0 // Downgrades are typically free

	case types.SubscriptionTransactionTypeRenewed:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot renew without existing subscription"})
			return
		}
		if currentSubscription.PlanName != req.PlanName {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "plan name is not same as current plan for renewal"})
			return
		}
		// Renewal uses full plan price

	case types.SubscriptionTransactionTypeCanceled:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot cancel without existing subscription"})
			return
		}
		// Cancellation has no cost
		transaction.Amount = 0
		transaction.Status = types.SubscriptionTransactionStatusPending
	}

	// Handle concurrent safety and last transaction validation before payment processing
	err = handleWorkspaceSubscriptionTransactionWithConcurrencyControl(c, currentSubscription, req, transaction)
	if err != nil {
		logrus.Errorf("handle workspace subscription transaction error: %v", err)
		// Error response already handled in the function
		return
	}
}

// Helper functions for workspace subscription payment logic

// handleWorkspaceSubscriptionTransactionWithConcurrencyControl provides unified transaction handling with concurrency control
func handleWorkspaceSubscriptionTransactionWithConcurrencyControl(c *gin.Context, subscription *types.WorkspaceSubscription, req *helper.WorkspaceSubscriptionOperatorReq, transaction types.WorkspaceSubscriptionTransaction) error {
	// Use database transaction to ensure concurrency control for the same workspace/region
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Check for existing pending transactions for the same workspace/region
		lastTransaction, err := dao.DBClient.GetLastWorkspaceSubscriptionTransaction(req.Workspace, req.RegionDomain)
		if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get last transaction: %v", err)})
			return err
		}

		logrus.Infof("last workspace subscription transaction: %v", lastTransaction)

		// Handle existing pending/processing transactions
		if lastTransaction != nil && (lastTransaction.Status == types.SubscriptionTransactionStatusProcessing || lastTransaction.Status == types.SubscriptionTransactionStatusPending) {
			// 判断是否为相同请求
			isSameRequest := lastTransaction.NewPlanName == req.PlanName &&
				lastTransaction.Operator == req.Operator &&
				lastTransaction.Period == req.Period

			if isSameRequest {
				// 相同请求，检查上次的 session/支付状态是否仍然有效
				if lastTransaction.PayStatus == types.SubscriptionPayStatusPending && lastTransaction.PayID != "" {
					if req.PayMethod == helper.STRIPE {
						// 对于 Stripe 支付，检查 PaymentOrder 状态
						var paymentOrder types.PaymentOrder
						if err := tx.Where("id = ?", lastTransaction.PayID).First(&paymentOrder).Error; err == nil {
							if paymentOrder.Status == types.PaymentOrderStatusPending && paymentOrder.CodeURL != "" {
								// Session 仍然有效，返回上次的支付链接
								logrus.Infof("Returning existing Stripe session for same request: %s", paymentOrder.CodeURL)
								c.JSON(http.StatusOK, gin.H{
									"redirectUrl": paymentOrder.CodeURL,
									"success":     true,
								})
								return fmt.Errorf("returned existing session")
							}
						}
					}
				}
				// 如果上次session已经失效，继续处理下面的逻辑
			} else if lastTransaction.PayStatus == types.SubscriptionPayStatusPending {
				// 不同请求，需要关闭/取消上次的请求
				logrus.Infof("Different request detected, canceling previous transaction. Old: plan=%s, operator=%s, period=%s; New: plan=%s, operator=%s, period=%s",
					lastTransaction.NewPlanName, lastTransaction.Operator, lastTransaction.Period,
					req.PlanName, req.Operator, req.Period)

				// TODO 需要调用 stripe.Api去取消交易，防止重复调用
				//if lastTransaction.PayID != "" {
				//	// 标记上次交易为已取消
				//	if err := tx.Model(&lastTransaction).Updates(map[string]interface{}{
				//		"status":      types.SubscriptionTransactionStatusFailed,
				//		"pay_status":  types.SubscriptionPayStatusFailed,
				//		"status_desc": "Canceled due to new different request",
				//	}).Error; err != nil {
				//		logrus.Errorf("Failed to cancel previous transaction: %v", err)
				//	} else {
				//		logrus.Infof("Successfully canceled previous transaction, continuing with new request")
				//	}
				//
				//	// 标记上次的支付订单为取消
				//	if err := tx.Model(&types.PaymentOrder{}).Where("id = ?", lastTransaction.PayID).Update("status", types.PaymentOrderStatusFailed).Error; err != nil {
				//		logrus.Errorf("Failed to cancel previous payment order: %v", err)
				//	}
				//}

				// 继续处理新请求
				return nil
			}

			// 原有的特殊情况处理逻辑
			if lastTransaction.Operator == types.SubscriptionTransactionTypeDowngraded {
				// Delete old downgrade transaction and continue
				if err := tx.Delete(&lastTransaction).Error; err != nil {
					SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to delete last subscription transaction: %v", err)})
					return err
				}
				logrus.Infof("Deleted old downgrade transaction, continuing with new operation")
			} else if lastTransaction.PayStatus == types.SubscriptionPayStatusNoNeed {
				SetErrorResp(c, http.StatusConflict, gin.H{"error": "The last subscription operation was not processed, please wait for the next cycle"})
				return fmt.Errorf("pending operation exists")
			} else if lastTransaction.PayStatus == types.SubscriptionPayStatusFailed {
				// Mark old transaction as failed and continue
				tx.Model(&lastTransaction).Update("status", types.SubscriptionTransactionStatusFailed)
				logrus.Errorf("last workspace subscription transaction pay failed, workspace: %s/%s", req.Workspace, req.RegionDomain)
			} else {
				switch lastTransaction.PayStatus {
				case types.SubscriptionPayStatusPending, types.SubscriptionPayStatusProcessing, types.SubscriptionPayStatusPaid, types.SubscriptionPayStatusUnpaid, types.SubscriptionPayStatusCanceled:
					SetErrorResp(c, http.StatusConflict, gin.H{"error": "there is already a pending workspace subscription transaction"})
				default:
					SetErrorResp(c, http.StatusConflict, gin.H{"error": "there is already a pending workspace subscription transaction"})
				}
				return fmt.Errorf("pending transaction exists")
				// Check existing payment order status

				//payment := &types.PaymentOrder{}
				//if err := tx.Model(&types.PaymentOrder{}).Where(`"userUid" = ? AND "id" = ?`, req.UserUID, lastTransaction.PayID).First(&payment).Error; err != nil {
				//	if err == gorm.ErrRecordNotFound {
				//		// Payment order not found, continue with new payment
				//		logrus.Warnf("Payment order not found for transaction %s, continuing", lastTransaction.PayID)
				//	} else {
				//		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get payment: %v", err)})
				//		return err
				//	}
				//} else {
				//	// Payment order exists, check status
				//	if payment.TradeNO != "" {
				//		// Query payment status from payment service
				//		payQueryResp, err := dao.PaymentService.QueryPayment(payment.TradeNO, "")
				//		if err != nil {
				//			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to query payment: %v", err)})
				//			return err
				//		}
				//
				//		// Handle payment status
				//		switch payQueryResp.PaymentStatus {
				//		case "SUCCESS":
				//			SetErrorResp(c, http.StatusOK, gin.H{"message": "payment already completed", "success": true})
				//			return fmt.Errorf("payment already completed")
				//		case "PROCESSING":
				//			if payment.CodeURL != "" {
				//				c.JSON(http.StatusOK, gin.H{"redirectUrl": payment.CodeURL, "success": true})
				//				return fmt.Errorf("payment in progress")
				//			}
				//			SetErrorResp(c, http.StatusConflict, gin.H{"error": "payment is processing"})
				//			return fmt.Errorf("payment in progress")
				//		case "PENDING":
				//			SetErrorResp(c, http.StatusConflict, gin.H{"error": "payment is pending, please wait"})
				//			return fmt.Errorf("payment pending")
				//		case "FAIL", "CANCELLED":
				//			// Mark payment and transaction as failed, then continue
				//			tx.Model(&payment).Update("status", types.PaymentOrderStatusFailed)
				//			tx.Model(&lastTransaction).Update("status", types.SubscriptionTransactionStatusFailed)
				//			logrus.Infof("Previous payment failed, continuing with new operation")
				//		default:
				//			SetErrorResp(c, http.StatusConflict, gin.H{"error": "there is already a pending workspace subscription transaction"})
				//			return fmt.Errorf("pending transaction exists")
				//		}
				//	}
				//}
			}
		}

		return nil // Validation passed, continue with payment processing
	}, func(tx *gorm.DB) error {
		// Process payment based on amount and method
		if transaction.Amount > 0 || req.Operator == types.SubscriptionTransactionTypeUpgraded {
			// Payment required - route to appropriate payment method
			switch req.PayMethod {
			case helper.STRIPE:
				return processStripePaymentInTransaction(tx, c, req, subscription, transaction)
			case helper.BALANCE:
				return processBalancePaymentInTransaction(tx, c, req, transaction)
			default:
				SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "unsupported payment method"})
				return fmt.Errorf("unsupported payment method")
			}
		} else {
			// No payment required (downgrades, cancellations) - set payStatus to no_need
			transaction.PayStatus = types.SubscriptionPayStatusNoNeed
			return processNoPaymentOperationInTransaction(tx, c, req, transaction)
		}
	})
}

func getCurrentWorkspacePlanPrice(plan *types.WorkspaceSubscriptionPlan, period types.SubscriptionPeriod) *types.ProductPrice {
	for _, price := range plan.Prices {
		if string(price.BillingCycle) == string(period) {
			return &price
		}
	}
	return nil
}

func getPeriodDays(period time.Duration) float64 {
	return float64(period.Hours()) / 24
}

// 创建订阅需要判断当前订阅状态，如果是active，不能创建新的订阅，只能升级或续费，如果是canceled或past_due，可以创建新的订阅
// processStripePaymentInTransaction handles Stripe payment within existing transaction
func processStripePaymentInTransaction(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, subscription *types.WorkspaceSubscription, transaction types.WorkspaceSubscriptionTransaction) error {
	// 1. Initialize transaction data
	if err := initializeTransactionData(tx, &transaction, req); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to initialize transaction: %v", err)})
		return err
	}

	// 2. Get plan price information
	price, err := dao.DBClient.GetWorkspaceSubscriptionPlanPrice(transaction.NewPlanName, transaction.Period)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get plan price: %v", err)})
		return err
	}

	// 3. Process based on operation type
	switch transaction.Operator {
	case types.SubscriptionTransactionTypeCreated, types.SubscriptionTransactionTypeRenewed:
		return processNewSubscription(tx, c, req, price, transaction)
	case types.SubscriptionTransactionTypeUpgraded:
		return processUpgradeSubscription(tx, c, req, subscription, price, transaction)
	default:
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "unsupported operator for Stripe payment"})
		return fmt.Errorf("unsupported operator")
	}
}

// initializeTransactionData initializes common transaction data
func initializeTransactionData(tx *gorm.DB, transaction *types.WorkspaceSubscriptionTransaction, req *helper.WorkspaceSubscriptionOperatorReq) error {
	// Generate payment ID if not provided
	if transaction.PayID == "" {
		paymentID, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("failed to create payment id: %w", err)
		}
		transaction.PayID = paymentID
	}

	transaction.PayStatus = types.SubscriptionPayStatusPending
	return nil
}

// processNewSubscription handles new subscription creation and renewal
func processNewSubscription(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, price *types.ProductPrice, transaction types.WorkspaceSubscriptionTransaction) error {
	// Create transaction record
	if transaction.Status == "" {
		transaction.Status = types.SubscriptionTransactionStatusProcessing
	}
	if transaction.OldPlanStatus == "" {
		transaction.OldPlanStatus = types.SubscriptionStatusNormal
	}
	if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &transaction); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create workspace subscription transaction: %v", err)})
		return err
	}

	// Create Stripe session and payment order
	return createStripeSessionAndPaymentOrder(tx, c, req, price, transaction)
}

// processUpgradeSubscription handles subscription upgrades
func processUpgradeSubscription(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, subscription *types.WorkspaceSubscription, price *types.ProductPrice, transaction types.WorkspaceSubscriptionTransaction) error {
	// Handle upgrade from Free plan (new subscription creation)
	if transaction.OldPlanName == types.FreeSubscriptionPlanName {
		return processNewSubscription(tx, c, req, price, transaction)
	}

	// Handle upgrade from paid plan (subscription modification)
	if price == nil || price.StripePrice == nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": "new plan has no valid Stripe price"})
		return fmt.Errorf("new plan has no valid Stripe price")
	}

	workspace, regionDomain := req.Workspace, req.RegionDomain
	err := dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Update existing Stripe subscription
		stripeResp, err := services.StripeServiceInstance.UpdatePlan(subscription.Stripe.SubscriptionID, *price.StripePrice)
		if err != nil {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to update Stripe subscription: %v", err)})
			return err
		}
		payment := &types.Payment{
			ID: transaction.PayID,
			PaymentRaw: types.PaymentRaw{
				Stripe:                  subscription.Stripe,
				UserUID:                 req.UserUID,
				RegionUID:               dao.DBClient.GetLocalRegion().UID,
				CreatedAt:               time.Now().UTC(),
				Method:                  helper.STRIPE,
				Amount:                  stripeResp.LatestInvoice.AmountPaid,
				TradeNO:                 stripeResp.LatestInvoice.ID,
				Type:                    types.PaymentTypeSubscription,
				ChargeSource:            types.ChargeSourceStripe,
				Status:                  types.PaymentStatusPAID,
				WorkspaceSubscriptionID: &subscription.ID,
				Message:                 fmt.Sprintf("Payment for workspace %s/%s (%s)", workspace, regionDomain, stripeResp.LatestInvoice.BillingReason),
			},
		}
		err = finalizeWorkspaceSubscriptionSuccess(tx, subscription, &transaction, payment, false)
		if err != nil {
			return fmt.Errorf("failed to finalize subscription payment: %v", err)
		}
		logrus.Infof("workspace: %s, Stripe subscription updated: %s, status: %s", subscription.Workspace, stripeResp.ID, stripeResp.Status)
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to process upgrade: %v", err)})
		return fmt.Errorf("failed to update Stripe subscription: %v", err)
	}
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Subscription upgraded successfully, waiting for update",
	})
	return nil
}

// createStripeSessionAndPaymentOrder creates Stripe session and corresponding payment order
func createStripeSessionAndPaymentOrder(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, price *types.ProductPrice, transaction types.WorkspaceSubscriptionTransaction) error {
	// Create payment request
	paymentReq := services.PaymentRequest{
		RequestID:     uuid.NewString(),
		UserUID:       req.UserUID,
		Amount:        transaction.Amount,
		Currency:      dao.PaymentCurrency,
		UserAgent:     c.GetHeader("User-Agent"),
		ClientIP:      c.ClientIP(),
		DeviceTokenID: c.GetHeader("Device-Token-ID"),
	}

	// Create Stripe subscription session
	stripeResp, err := services.StripeServiceInstance.CreateWorkspaceSubscriptionSession(paymentReq, *price.StripePrice, &transaction)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create Stripe session: %v", err)})
		return err
	}

	// Create payment order
	paymentOrder := &types.PaymentOrder{
		ID: transaction.PayID,
		PaymentRaw: types.PaymentRaw{
			UserUID:      req.UserUID,
			Amount:       transaction.Amount,
			Method:       string(req.PayMethod),
			RegionUID:    dao.DBClient.GetLocalRegion().UID,
			TradeNO:      paymentReq.RequestID,
			CodeURL:      stripeResp.URL,
			Type:         types.PaymentTypeSubscription,
			ChargeSource: types.ChargeSourceStripe,
		},
		Status: types.PaymentOrderStatusPending,
	}

	if err := tx.Create(paymentOrder).Error; err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create payment order: %v", err)})
		return err
	}

	// Return success response with redirect URL
	c.JSON(http.StatusOK, gin.H{
		"redirectUrl": stripeResp.URL,
		"success":     true,
	})
	return nil
}

// processBalancePaymentInTransaction handles balance payment within existing transaction
func processBalancePaymentInTransaction(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, transaction types.WorkspaceSubscriptionTransaction) error {
	// Generate payment ID if not provided
	if transaction.PayID == "" {
		paymentID, err := gonanoid.New(12)
		if err != nil {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create payment id: %v", err)})
			return err
		}
		transaction.PayID = paymentID
	}

	// Check account balance
	var account types.Account
	if err := tx.Where(types.Account{UserUID: req.UserUID}).First(&account).Error; err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get account: %v", err)})
		return err
	}
	if account.Balance-account.DeductionBalance < transaction.Amount {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "insufficient balance"})
		return fmt.Errorf("insufficient balance")
	}

	// Create workspace subscription transaction
	transaction.PayStatus = types.SubscriptionPayStatusPaid
	transaction.Status = types.SubscriptionTransactionStatusCompleted
	if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &transaction); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create workspace subscription transaction: %v", err)})
		return err
	}

	// Create payment record
	payment := types.Payment{
		ID: transaction.PayID,
		PaymentRaw: types.PaymentRaw{
			UserUID:      req.UserUID,
			Amount:       transaction.Amount,
			Method:       string(req.PayMethod),
			RegionUID:    dao.DBClient.GetLocalRegion().UID,
			Type:         types.PaymentTypeSubscription,
			ChargeSource: types.ChargeSourceBalance,
			TradeNO:      transaction.PayID,
			Status:       types.PaymentStatusPAID,
		},
	}
	if err := tx.Create(&payment).Error; err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to save payment: %v", err)})
		return err
	}

	// Deduct balance using the proper helper function
	if err := cockroach.AddDeductionAccount(tx, req.UserUID, transaction.Amount); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to deduct balance: %v", err)})
		return err
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Payment processed successfully",
	})
	return nil
}

// TODO 待完成
// processNoPaymentOperationInTransaction handles operations that don't require payment within existing transaction
func processNoPaymentOperationInTransaction(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, transaction types.WorkspaceSubscriptionTransaction) error {
	// Ensure payStatus is set to no_need for operations without payment
	if transaction.PayStatus == "" {
		transaction.PayStatus = types.SubscriptionPayStatusNoNeed
	}

	// Set appropriate status based on operator
	switch transaction.Operator {
	// TODO 非Free用户关闭需要将 workspaceSubscription.CancelAtPeriodEnd改为 true，并且关闭stripe订阅，订阅状态修改为cancel状态（目前不提供主动cancel）
	// 降级则创建开始时间为 workspaceSubscription.CurrentPeriodEndAt的pending状态的操作降级的workspaceSubscriptionTransaction
	//等待workspaceSubscription.CurrentPeriodEndAt结束后处理
	case types.SubscriptionTransactionTypeDowngraded, types.SubscriptionTransactionTypeCanceled:
		// These operations take effect later, so keep as pending
		transaction.Status = types.SubscriptionTransactionStatusPending
	default:
		// Immediate operations (like free plan creation)
		transaction.Status = types.SubscriptionTransactionStatusCompleted
	}

	// Create workspace subscription transaction
	if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &transaction); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create workspace subscription transaction: %v", err)})
		return err
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("Workspace subscription %s operation completed successfully", transaction.Operator),
	})
	return nil
}

// NewWorkspaceSubscriptionNotifyHandler handles Stripe webhook notifications
// @Summary Handle Stripe webhook for workspace subscription
// @Description Handle Stripe webhook notifications for workspace subscription events
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Router /payment/v1alpha1/workspace-subscription/notify [post]
func NewWorkspaceSubscriptionNotifyHandler(c *gin.Context) {
	if services.StripeServiceInstance == nil {
		logrus.Error("Stripe service not initialized")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Stripe service not configured"})
		return
	}

	payload, err := c.GetRawData()
	if err != nil {
		logrus.Errorf("Failed to get raw data: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "failed to get raw data"})
		return
	}

	signature := c.GetHeader("Stripe-Signature")
	event, err := services.StripeServiceInstance.HandleWebhook(payload, signature)
	if err != nil {
		logrus.Errorf("Failed to handle webhook: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook signature"})
		return
	}

	logrus.Infof("Received Stripe workspace subscription event: %s", event.Type)

	// Process workspace subscription webhook events
	err = processWorkspaceSubscriptionWebhookEvent(event)
	if err != nil {
		logrus.Errorf("Failed to process workspace subscription webhook event %s: %v", event.Type, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to process webhook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"received": true})
}

// processWorkspaceSubscriptionWebhookEvent processes webhook events with database operations
// Following the pattern of subscription.go's processSubscriptionPayResult
func processWorkspaceSubscriptionWebhookEvent(event *stripe.Event) error {
	switch event.Type {
	// TODO First payment: Store subscription id + customer id in WorkspaceSubscription
	case "checkout.session.completed":
		// Handle initial subscription payment success
		// return handleWorkspaceSubscriptionSessionCompleted(event)

		// TODO When the payment is successful, it will be sent at each billing interval. It is necessary to consider how to handle it if it is sent repeatedly within the current interval
		// 1. 创建 renewal WorkspaceSubscriptionTransaction 状态为已支付，支付方式为 Stripe，并创建关联的payment
	case "invoice.paid":
		// Handle recurring subscription payment success

		return handleWorkspaceSubscriptionInvoicePaid(event)
		// return nil
	// TODO 付费失败时每个计费间隔发送， 需要考虑如果当前间隔内重复发送如何处理
	// 1. try to pay with your balance
	// 2. If the balance is insufficient, send a payment failure notification
	// 3. If the Balance enough, update the renewal WorkspaceSubscriptionTransaction status as paid, payment for the Balance, and create the related payment
	case "invoice.payment_failed":
		// Handle recurring subscription renewal failure
		return handleWorkspaceSubscriptionRenewalFailure(event)
		//case "invoice.payment_succeeded":
		//	// Handle recurring subscription renewal success
		//	return handleWorkspaceSubscriptionRenewalSuccess(event)
		//case "customer.subscription.deleted":
		//	// Handle subscription cancellation/closure
		//	return handleWorkspaceSubscriptionClosure(event)
		//case "checkout.session.expired":
		//	// Handle payment session timeout/expiry
		// return handleWorkspaceSubscriptionPaymentFailure(event)
	case "customer.subscription.updated":
		// Handle subscription schedule updates
	case "checkout.session.expired":
		return handleWorkspaceSubscriptionSessionExpired(event)
	default:
		logrus.Infof("Unhandled workspace subscription webhook event type: %s", event.Type)
		return nil
	}
	return nil
}

// Helper function to finalize successful payment processing
// This abstracts common logic for updating subscription, quota, and traffic
func finalizeWorkspaceSubscriptionSuccess(tx *gorm.DB, workspaceSubscription *types.WorkspaceSubscription, wsTransaction *types.WorkspaceSubscriptionTransaction, payment *types.Payment, isInitial bool) error {
	if wsTransaction.PayID == "" {
		wsTransaction.PayID = payment.ID
		if payment.ID == "" {
			paymentID, err := gonanoid.New(12)
			if err != nil {
				return fmt.Errorf("failed to create payment id: %w", err)
			}
			wsTransaction.PayID = paymentID
			payment.ID = paymentID
		}
	}
	if workspaceSubscription != nil {
		payment.WorkspaceSubscriptionID = &workspaceSubscription.ID
	}
	wsTransaction.Status = types.SubscriptionTransactionStatusCompleted
	wsTransaction.PayStatus = types.SubscriptionPayStatusPaid
	// Create or update transaction
	if isInitial {
		// For initial, transaction already exists, just ensure status
		if err := tx.Save(wsTransaction).Error; err != nil {
			return fmt.Errorf("failed to update workspace subscription transaction: %w", err)
		}
	} else {
		// For renewal, create new transaction
		if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, wsTransaction); err != nil {
			return fmt.Errorf("failed to create workspace subscription transaction: %w", err)
		}
	}

	if payment.Amount > 0 {
		// Create payment
		if err := tx.Create(payment).Error; err != nil {
			return fmt.Errorf("failed to create payment record: %w", err)
		}
	}

	// Update or create workspace subscription
	oldPlanName := ""
	if workspaceSubscription != nil {
		oldPlanName = workspaceSubscription.PlanName
		workspaceSubscription.PlanName = wsTransaction.NewPlanName
		workspaceSubscription.PayStatus = types.SubscriptionPayStatusPaid
		workspaceSubscription.TrafficStatus = types.WorkspaceTrafficStatusActive
		workspaceSubscription.PayMethod = types.PaymentMethod(payment.Method)
		if payment.Stripe != nil {
			workspaceSubscription.Stripe = payment.Stripe
		}
	} else {
		// Create new for initial if not exists
		workspaceSubscription = &types.WorkspaceSubscription{
			ID:                   uuid.New(),
			PlanName:             wsTransaction.NewPlanName,
			Workspace:            wsTransaction.Workspace,
			RegionDomain:         wsTransaction.RegionDomain,
			UserUID:              wsTransaction.UserUID,
			Status:               types.SubscriptionStatusNormal,
			TrafficStatus:        types.WorkspaceTrafficStatusActive,
			PayStatus:            types.SubscriptionPayStatusPaid,
			PayMethod:            types.PaymentMethod(payment.Method),
			CurrentPeriodStartAt: time.Now().UTC(),
			CurrentPeriodEndAt:   time.Now().UTC().AddDate(0, 1, 0), // Monthly
			CreateAt:             time.Now().UTC(),
			ExpireAt:             stripe.Time(time.Now().UTC().AddDate(0, 1, 0)),
		}
		if payment.Stripe != nil {
			workspaceSubscription.Stripe = payment.Stripe
		}
	}

	// Set period for renewal
	if wsTransaction.Operator == types.SubscriptionTransactionTypeRenewed {
		workspaceSubscription.CurrentPeriodStartAt = workspaceSubscription.CurrentPeriodEndAt
		workspaceSubscription.CurrentPeriodEndAt = workspaceSubscription.CurrentPeriodEndAt.AddDate(0, 1, 0)
		workspaceSubscription.ExpireAt = stripe.Time(workspaceSubscription.CurrentPeriodEndAt)
	}

	if err := tx.Save(workspaceSubscription).Error; err != nil {
		return fmt.Errorf("failed to save workspace subscription: %w", err)
	}

	// Update resource quota for create or upgrade
	if wsTransaction.Operator == types.SubscriptionTransactionTypeCreated || wsTransaction.Operator == types.SubscriptionTransactionTypeUpgraded {
		res := dao.WorkspacePlanResQuota[wsTransaction.NewPlanName].DeepCopy()
		// TODO 需要考虑默认的其他quota限制，nodeport等
		nsQuota := resources.GetDefaultResourceQuota(workspaceSubscription.Workspace, "quota-"+workspaceSubscription.Workspace)
		for defaultRs, quantity := range nsQuota.Spec.Hard {
			if _, ok := res[defaultRs]; ok {
				continue
			}
			res[defaultRs] = quantity.DeepCopy()
		}
		nsQuota.Spec.Hard = res
		_, err := controllerutil.CreateOrUpdate(context.Background(), dao.K8sManager.GetClient(), nsQuota, func() error {
			nsQuota.Spec.Hard = res
			return nil
		})
		if err != nil {
			return fmt.Errorf("failed to create or update resource quota: %w", err)
		}
	}

	// Add traffic package
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(wsTransaction.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	traffic := plan.Traffic
	if (wsTransaction.Operator == types.SubscriptionTransactionTypeUpgraded || wsTransaction.Operator == types.SubscriptionTransactionTypeRenewed) && oldPlanName != "" && oldPlanName != types.FreeSubscriptionPlanName {
		oldPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(oldPlanName)
		if err != nil {
			return fmt.Errorf("failed to get old workspace subscription plan: %w", err)
		}
		traffic -= oldPlan.Traffic
		if traffic < 0 {
			traffic = 0
		}
	}
	if traffic > 0 {
		err = dao.AddWorkspaceSubscriptionTrafficPackage(tx, workspaceSubscription.ID, traffic, workspaceSubscription.CurrentPeriodEndAt, types.WorkspaceTrafficFromWorkspaceSubscription, wsTransaction.ID.String())
		if err != nil {
			return fmt.Errorf("failed to add traffic package: %w", err)
		}
	}

	return nil
}

// Updated handleWorkspaceSubscriptionInvoicePaid using the helper
func handleWorkspaceSubscriptionInvoicePaid(event *stripe.Event) error {
	// Parse invoice data (same as before)
	sessionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	invoice, ok := sessionData.(*stripe.Invoice)
	if !ok {
		return fmt.Errorf("invalid session data type")
	}
	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
		return fmt.Errorf("invoice has no associated subscription")
	}

	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
	session, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get Stripe subscription: %w", err)
	}

	logrus.Infof("Processing invoice payment for subscription: %s", session.ID)

	// Get metadata (same)
	workspace := session.Metadata["workspace"]
	regionDomain := session.Metadata["region_domain"]
	userUIDStr := session.Metadata["user_uid"]
	newPlanName := session.Metadata["plan_name"]
	paymentID := session.Metadata["payment_id"]
	operator := session.Metadata["subscription_operator"]

	if workspace == "" || regionDomain == "" || userUIDStr == "" || newPlanName == "" {
		return fmt.Errorf("missing required metadata in session, now metadata: %v", session.Metadata)
	}

	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		return fmt.Errorf("invalid user UID in metadata: %w", err)
	}

	// Get workspace subscription
	workspaceSubscription, err := dao.DBClient.GetWorkspaceSubscription(workspace, regionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get workspace subscription: %w", err)
	}
	// subscription_update Upgrading the subscription payment can be completed without the need for webhook processing
	isUpgradeSubscription := invoice.BillingReason == "subscription_update"
	if isUpgradeSubscription {
		return nil
	}

	isInitialSubscription := invoice.BillingReason == "subscription_create"
	isRenewSubscription := invoice.BillingReason == "subscription_cycle"
	if !isInitialSubscription && !isRenewSubscription {
		return fmt.Errorf("unsupported billing reason: %s", invoice.BillingReason)
	}

	// Database operations
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		var wsTransaction types.WorkspaceSubscriptionTransaction
		var payment types.Payment

		// Generate paymentID for renewals
		if !isInitialSubscription {
			paymentID, err = gonanoid.New(12)
			if err != nil {
				return fmt.Errorf("failed to create payment id: %w", err)
			}
		}

		// Prepare transaction
		if isInitialSubscription {
			if paymentID == "" {
				return fmt.Errorf("missing payment_id for initial subscription")
			}
			if err := tx.Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
				return fmt.Errorf("workspace subscription transaction not found: %w", err)
			}
			wsTransaction.PayStatus = types.SubscriptionPayStatusPaid
		} else if isRenewSubscription {
			wsTransaction = types.WorkspaceSubscriptionTransaction{
				ID:           uuid.New(),
				From:         types.TransactionFromUser,
				Workspace:    workspace,
				RegionDomain: regionDomain,
				UserUID:      userUID,
				NewPlanName:  newPlanName,
				Operator:     types.SubscriptionTransactionTypeRenewed,
				StartAt:      time.Now().UTC(),
				CreatedAt:    time.Now().UTC(),
				UpdatedAt:    time.Now().UTC(),
				PayStatus:    types.SubscriptionPayStatusPaid,
				PayID:        paymentID,
				Period:       types.SubscriptionPeriodMonthly,
				Amount:       invoice.AmountPaid,
			}
			if workspaceSubscription != nil {
				wsTransaction.OldPlanName = workspaceSubscription.PlanName
				wsTransaction.OldPlanStatus = workspaceSubscription.Status
			}
		}

		// Prepare payment
		payment = types.Payment{
			ID: paymentID,
			PaymentRaw: types.PaymentRaw{
				Stripe: &types.StripePay{
					SubscriptionID: session.ID,
					CustomerID:     session.Customer.ID,
				},
				UserUID:      userUID,
				RegionUID:    dao.DBClient.GetLocalRegion().UID,
				CreatedAt:    time.Now().UTC(),
				Method:       helper.STRIPE,
				Amount:       invoice.AmountPaid,
				TradeNO:      invoice.ID,
				Type:         types.PaymentTypeSubscription,
				ChargeSource: types.ChargeSourceStripe,
				Status:       types.PaymentStatusPAID,
				Message:      fmt.Sprintf("Payment for workspace %s/%s (%s)", workspace, regionDomain, invoice.BillingReason),
			},
		}
		if workspaceSubscription != nil {
			payment.WorkspaceSubscriptionID = &workspaceSubscription.ID
		}

		// For initial, delete payment order
		if isInitialSubscription {
			var paymentOrder types.PaymentOrder
			if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
				if err := tx.Delete(&paymentOrder).Error; err != nil {
					return fmt.Errorf("failed to delete payment order: %w", err)
				}
			}
		}

		// Finalize
		if err := finalizeWorkspaceSubscriptionSuccess(tx, workspaceSubscription, &wsTransaction, &payment, isInitialSubscription); err != nil {
			return err
		}

		// TODO: Send notification
		nr, err := dao.DBClient.GetNotificationRecipient(userUID)
		if err != nil {
			logrus.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
			return fmt.Errorf("failed to get notification recipient for user %s: %w", userUID, err)
		}
		dao.UserContactProvider.SetUserContact(userUID, nr)
		defer dao.UserContactProvider.RemoveUserContact(userUID)
		eventData := &usernotify.WorkspaceSubscriptionEventData{
			WorkspaceName: workspace,
			Operator:      types.SubscriptionOperator(operator),
			Domain:        regionDomain,
			//Status:
			PayStatus:   types.SubscriptionPayStatusPaid,
			OldPlanName: wsTransaction.OldPlanName,
			NewPlanName: wsTransaction.NewPlanName,
			Amount:      math.Ceil(float64(invoice.AmountPaid) / float64(100)),
		}
		// TODO 需要考虑消息发送失败的情况，本身已经重试过了，失败的话先入数据库作为记录
		switch types.SubscriptionOperator(operator) {
		case types.SubscriptionTransactionTypeCreated, types.SubscriptionTransactionTypeUpgraded, types.SubscriptionTransactionTypeRenewed:
			if _, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, eventData, types.SubscriptionOperator(operator), []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
				logrus.Errorf("failed to handle workspace subscription event: %v", err)
				// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
			}
		default:
			logrus.Errorf("unsupported subscription operator: %s", types.SubscriptionOperator(operator))
		}
		logrus.Infof("Successfully processed workspace subscription %s for %s/%s", invoice.BillingReason, workspace, regionDomain)
		return nil
	})
}

// Reimplemented handleWorkspaceSubscriptionRenewalFailure
func handleWorkspaceSubscriptionRenewalFailure(event *stripe.Event) error {
	// Parse invoice data
	sessionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	invoice, ok := sessionData.(*stripe.Invoice)
	if !ok {
		return fmt.Errorf("invalid invoice data type")
	}
	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
		return fmt.Errorf("invoice has no associated subscription")
	}

	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
	session, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get Stripe subscription: %w", err)
	}

	logrus.Infof("Processing invoice payment failure for subscription: %s", session.ID)

	// Get metadata
	workspace := session.Metadata["workspace"]
	regionDomain := session.Metadata["region_domain"]
	userUIDStr := session.Metadata["user_uid"]
	newPlanName := session.Metadata["plan_name"]
	paymentID := session.Metadata["payment_id"]
	operator := session.Metadata["subscription_operator"]

	if workspace == "" || regionDomain == "" || userUIDStr == "" || newPlanName == "" {
		return fmt.Errorf("missing required metadata in session")
	}

	// Get workspace subscription
	workspaceSubscription, err := dao.DBClient.GetWorkspaceSubscription(workspace, regionDomain)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("workspace subscription not found for renewal failure")
		}
		return fmt.Errorf("failed to get workspace subscription: %w", err)
	}
	userUID := workspaceSubscription.UserUID

	isInitialSubscription := invoice.BillingReason == "subscription_create"
	isRenewSubscription := invoice.BillingReason == "subscription_cycle"
	if !isInitialSubscription && !isRenewSubscription {
		logrus.Errorf("handleWorkspaceSubscriptionRenewalFailure unsupported billing reason for payment failure: %s", invoice.BillingReason)
		return fmt.Errorf("unsupported billing reason: %s", invoice.BillingReason)
	}
	failureReason := fmt.Sprintf("Stripe payment failed for invoice %s: %s", invoice.ID, invoice.LastFinalizationError.Error())

	// TODO: Send notification - initial payment failed
	notifyEventData := &usernotify.WorkspaceSubscriptionEventData{
		WorkspaceName: workspace,
		Domain:        regionDomain,
		Operator:      types.SubscriptionOperator(operator),
		PayStatus:     types.SubscriptionPayStatusFailed,
		//OldPlanName:   wsTransaction.OldPlanName,
		//NewPlanName:   wsTransaction.NewPlanName,
		Amount:      math.Ceil(float64(invoice.AmountDue) / float64(100)),
		ErrorReason: invoice.LastFinalizationError.Error(),
	}
	nr, err := dao.DBClient.GetNotificationRecipient(userUID)
	if err != nil {
		return fmt.Errorf("failed to get notification recipient for user %s: %w", userUID, err)
	}
	dao.UserContactProvider.SetUserContact(userUID, nr)
	defer dao.UserContactProvider.RemoveUserContact(userUID)

	// Database operations
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		if isInitialSubscription {
			if paymentID == "" {
				return fmt.Errorf("missing payment_id for initial failure")
			}

			// Update transaction to failed
			var wsTransaction types.WorkspaceSubscriptionTransaction
			if err := tx.Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
				return fmt.Errorf("transaction not found: %w", err)
			}
			wsTransaction.PayStatus = types.SubscriptionPayStatusFailed
			wsTransaction.Status = types.SubscriptionTransactionStatusFailed
			wsTransaction.StatusDesc = failureReason
			if err := tx.Save(&wsTransaction).Error; err != nil {
				return fmt.Errorf("failed to update transaction: %w", err)
			}

			// Update payment order to failed if exists
			var paymentOrder types.PaymentOrder
			if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
				paymentOrder.Status = types.PaymentOrderStatusFailed
				if err := tx.Save(&paymentOrder).Error; err != nil {
					return fmt.Errorf("failed to update payment order: %w", err)
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("failed to query payment order: %w", err)
			}

			// TODO: Send notification - initial payment failed
			notifyEventData.OldPlanName = newPlanName
			notifyEventData.NewPlanName = newPlanName
			notifyEventData.Operator = types.SubscriptionTransactionTypeCreated
			logrus.Warnf("Initial subscription payment failed for %s/%s", workspace, regionDomain)
		} else {
			// Renewal failure - try balance
			var account types.Account
			if err := tx.Where("user_uid = ?", userUID).First(&account).Error; err != nil {
				return fmt.Errorf("failed to get account: %w", err)
			}

			if account.Balance-account.DeductionBalance >= invoice.AmountDue {
				// Balance payment success
				paymentID, err := gonanoid.New(12)
				if err != nil {
					return fmt.Errorf("failed to create payment id: %w", err)
				}

				// Prepare payment
				payment := types.Payment{
					ID: paymentID,
					PaymentRaw: types.PaymentRaw{
						UserUID:                 userUID,
						RegionUID:               dao.DBClient.GetLocalRegion().UID,
						CreatedAt:               time.Now().UTC(),
						Method:                  helper.BALANCE,
						Amount:                  invoice.AmountDue,
						TradeNO:                 paymentID,
						Type:                    types.PaymentTypeSubscription,
						ChargeSource:            types.ChargeSourceBalance,
						Status:                  types.PaymentStatusPAID,
						WorkspaceSubscriptionID: &workspaceSubscription.ID,
						Message:                 fmt.Sprintf("Balance fallback for failed Stripe renewal on workspace %s/%s", workspace, regionDomain),
					},
				}

				// Deduct balance
				if err := cockroach.AddDeductionAccount(tx, userUID, invoice.AmountDue); err != nil {
					return fmt.Errorf("failed to deduct balance: %w", err)
				}

				// Prepare transaction
				wsTransaction := types.WorkspaceSubscriptionTransaction{
					ID:            uuid.New(),
					From:          types.TransactionFromUser,
					Workspace:     workspace,
					RegionDomain:  regionDomain,
					UserUID:       userUID,
					OldPlanName:   workspaceSubscription.PlanName,
					NewPlanName:   newPlanName,
					OldPlanStatus: workspaceSubscription.Status,
					Operator:      types.SubscriptionTransactionTypeRenewed,
					StartAt:       time.Now().UTC(),
					CreatedAt:     time.Now().UTC(),
					UpdatedAt:     time.Now().UTC(),
					PayStatus:     types.SubscriptionPayStatusPaid,
					PayID:         paymentID,
					Period:        types.SubscriptionPeriodMonthly,
					Amount:        invoice.AmountDue,
				}

				// Finalize using helper (not initial)
				if err := finalizeWorkspaceSubscriptionSuccess(tx, workspaceSubscription, &wsTransaction, &payment, false); err != nil {
					return err
				}

				notifyEventData.Operator = types.SubscriptionTransactionTypeRenewed
				notifyEventData.OldPlanName = newPlanName
				notifyEventData.NewPlanName = newPlanName
				notifyEventData.PayStatus = types.SubscriptionPayStatusFailedAndUseBalance
				// TODO 需要考虑用户stripe支付失败最终关闭后的状态，将用户的支付状态修改为Balance支付
				// TODO: Send notification - renewal failed on Stripe, but succeeded with balance deduction
				logrus.Infof("Renewal succeeded with balance for %s/%s", workspace, regionDomain)
			} else {
				// Both payments failed
				workspaceSubscription.PayStatus = types.SubscriptionPayStatusFailed
				workspaceSubscription.Status = types.SubscriptionStatusDebt
				if err := tx.Save(workspaceSubscription).Error; err != nil {
					return fmt.Errorf("failed to update subscription to debt status: %w", err)
				}

				// //TODO: Mark workspace as debt (e.g., add label or update field)
				if err := updateDebtNamespaceStatus(context.Background(), dao.K8sManager.GetClient(), SuspendDebtNamespaceAnnoStatus, []string{workspace}); err != nil {
					return fmt.Errorf("update namespace status error: %w", err)
				}

				notifyEventData.Operator = types.SubscriptionTransactionTypeRenewed
				notifyEventData.OldPlanName = newPlanName
				notifyEventData.NewPlanName = newPlanName
				notifyEventData.PayStatus = types.SubscriptionPayStatusFailed
				// TODO: Send notification - renewal failed, please renew manually
				logrus.Warnf("Renewal failed for %s/%s, set to debt status", workspace, regionDomain)
			}
		}

		// send notifycation
		if _, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, notifyEventData, types.SubscriptionOperator(operator), []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
			logrus.Errorf("failed to send subscription failure notification to user %s: %v", userUID, err)
			// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
		}
		return nil
	})
}

// checkout.session.expired
// handleWorkspaceSubscriptionSessionExpired handles payment session expirations
func handleWorkspaceSubscriptionSessionExpired(event *stripe.Event) error {
	// Parse session data from webhook event
	sessionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	session, ok := sessionData.(*stripe.CheckoutSession)
	if !ok {
		return fmt.Errorf("invalid session data type")
	}

	logrus.Infof("Processing workspace subscription session expired: %s", session.ID)

	// Get metadata
	paymentID := session.Metadata["payment_id"]
	if paymentID == "" {
		return fmt.Errorf("missing payment_id in session metadata")
	}

	// Database operations within transaction
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// 检查 PaymentOrder 是否存在
		var paymentOrder types.PaymentOrder
		if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("payment order not found for ID: %s", paymentID)
			}
			return fmt.Errorf("failed to query payment order: %w", err)
		}

		// 更新 PaymentOrder 状态为 Expired
		if err := tx.Model(&types.PaymentOrder{}).Where("id = ?", paymentID).Updates(map[string]interface{}{
			"status": types.PaymentStatusExpired,
		}).Error; err != nil {
			return fmt.Errorf("failed to update payment order status: %w", err)
		}

		// 检查 WorkspaceSubscriptionTransaction 是否存在
		var subscriptionTx types.WorkspaceSubscriptionTransaction
		if err := tx.Where("pay_id = ?", paymentID).First(&subscriptionTx).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("workspace subscription transaction not found for payment ID: %s", paymentID)
			}
			return fmt.Errorf("failed to query workspace subscription transaction: %w", err)
		}

		// 更新 WorkspaceSubscriptionTransaction 状态为 Failed
		if err := tx.Model(&types.WorkspaceSubscriptionTransaction{}).Where("pay_id = ?", paymentID).Updates(map[string]interface{}{
			"pay_status":  types.SubscriptionPayStatusExpired,
			"status":      types.SubscriptionTransactionStatusFailed,
			"status_desc": fmt.Sprintf("Payment session expired: %s", event.Type),
		}).Error; err != nil {
			return fmt.Errorf("failed to update workspace subscription transaction: %w", err)
		}

		// 记录日志
		logrus.Infof("Successfully marked workspace subscription transaction as failed for payment ID: %s, backend controller will handle subscription updates", paymentID)
		return nil
	})
}

// handleWorkspaceSubscriptionPaymentFailure handles payment session failures, timeouts, or cancellations
func handleWorkspaceSubscriptionPaymentFailure(event *stripe.Event) error {
	// Parse session data from webhook event
	sessionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	session, ok := sessionData.(*stripe.CheckoutSession)
	if !ok {
		return fmt.Errorf("invalid session data type")
	}

	logrus.Infof("Processing workspace subscription payment failure: %s", session.ID)

	// Get metadata
	paymentID := session.Metadata["payment_id"]
	if paymentID == "" {
		return fmt.Errorf("missing payment_id in session metadata")
	}

	// Database operations within transaction
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Update payment order status to failed
		if err := tx.Model(&types.PaymentOrder{}).Where("id = ?", paymentID).Updates(map[string]interface{}{
			"status": types.PaymentOrderStatusFailed,
		}).Error; err != nil {
			return fmt.Errorf("failed to update payment order status: %w", err)
		}

		// Update workspace subscription transaction status to failed
		if err := tx.Model(&types.WorkspaceSubscriptionTransaction{}).Where("pay_id = ?", paymentID).Updates(map[string]interface{}{
			"pay_status":  types.SubscriptionPayStatusFailed,
			"status":      types.SubscriptionTransactionStatusFailed,
			"status_desc": fmt.Sprintf("Payment failed or expired: %s", event.Type),
		}).Error; err != nil {
			return fmt.Errorf("failed to update workspace subscription transaction: %w", err)
		}

		// Note: Backend controller will handle WorkspaceSubscription updates based on this transaction status
		logrus.Infof("Successfully marked workspace subscription transaction as failed for payment ID: %s, backend controller will handle subscription updates", paymentID)
		return nil
	})
}

// handleWorkspaceSubscriptionSuccess handles automatic subscription renewal success
func handleWorkspaceSubscriptionSuccess(event *stripe.Event) error {
	// Parse invoice data from webhook event
	invoiceData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	invoice, ok := invoiceData.(*stripe.Invoice)
	if !ok {
		return fmt.Errorf("invalid invoice data type")
	}

	logrus.Infof("Processing workspace subscription renewal success: %s", invoice.ID)

	// Get subscription metadata
	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
		return fmt.Errorf("invoice has no associated subscription")
	}

	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID

	stripeSub, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get Stripe subscription: %w", err)
	}
	// Get metadata from Stripe subscription
	workspace := stripeSub.Metadata["workspace"]
	regionDomain := stripeSub.Metadata["region_domain"]
	userUIDStr := stripeSub.Metadata["user_uid"]
	newPlanName := stripeSub.Metadata["plan_name"]
	if workspace == "" || regionDomain == "" || userUIDStr == "" || newPlanName == "" {
		return fmt.Errorf("missing required metadata in Stripe subscription")
	}
	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		return fmt.Errorf("invalid user UID in metadata: %w", err)
	}
	workspaceSub, err := dao.DBClient.GetWorkspaceSubscription(workspace, regionDomain)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription: %w", err)
	}

	// TODO set subscription metadata to workspace subscription
	// Database operations within transaction - only handle Transaction, not WorkspaceSubscription
	// Backend controller will handle WorkspaceSubscription updates based on transaction status
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Generate new payment ID for renewal
		paymentID, err := gonanoid.New(12)
		if err != nil {
			return fmt.Errorf("failed to create payment id: %w", err)
		}

		// Create payment record for renewal
		payment := types.Payment{
			ID: paymentID,
			PaymentRaw: types.PaymentRaw{
				UserUID:   userUID,
				RegionUID: dao.DBClient.GetLocalRegion().UID,
				CreatedAt: time.Now().UTC(),
				// TODO 保存到 WorkspaceSubscription 中
				//Stripe: &types.StripePay{
				//	SubscriptionID: stripeSub.ID,
				//	CustomerID:     stripeSub.Customer.ID,
				//},
				Method: helper.STRIPE,
				// TODO 转换为对应平台比例额度
				Amount:                  invoice.AmountPaid,
				TradeNO:                 invoice.ID,
				Type:                    types.PaymentTypeSubscription,
				ChargeSource:            types.ChargeSourceStripe,
				Status:                  types.PaymentStatusPAID,
				WorkspaceSubscriptionID: &workspaceSub.ID,
				Message:                 fmt.Sprintf("Automatic renewal for workspace %s/%s", workspace, regionDomain),
			},
		}

		if err := tx.Create(&payment).Error; err != nil {
			return fmt.Errorf("failed to create renewal payment record: %w", err)
		}
		operator := types.SubscriptionTransactionTypeCreated
		if workspaceSub.PlanName == newPlanName {
			operator = types.SubscriptionTransactionTypeRenewed
		}

		// Create WorkspaceSubscriptionTransaction for renewal record
		renewalTransaction := types.WorkspaceSubscriptionTransaction{
			ID:           uuid.New(),
			From:         types.TransactionFromUser, // System operation
			Workspace:    workspace,
			RegionDomain: regionDomain,
			UserUID:      userUID,
			OldPlanName:  workspaceSub.PlanName,
			NewPlanName:  newPlanName,
			Operator:     operator,
			StartAt:      time.Now().UTC(),
			CreatedAt:    time.Now().UTC(),
			UpdatedAt:    time.Now().UTC(),
			// Status:        types.SubscriptionTransactionStatusCompleted,
			PayStatus: types.SubscriptionPayStatusPaid,
			PayID:     paymentID,
			Period:    types.SubscriptionPeriodMonthly, // Default to monthly, can be enhanced later
			// TODO 转为对应平台比例额度
			Amount: invoice.AmountPaid,
		}
		if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &renewalTransaction); err != nil {
			return fmt.Errorf("failed to create renewal transaction: %w", err)
		}
		newPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(newPlanName)
		if err != nil {
			return fmt.Errorf("failed to get new plan %s: %w", newPlanName, err)
		}
		period, err := types.ParsePeriod(renewalTransaction.Period)
		if err != nil {
			return fmt.Errorf("failed to parse period %s: %w", renewalTransaction.Period, err)
		}
		// 1. 添加流量
		err = dao.AddWorkspaceSubscriptionTrafficPackage(tx, workspaceSub.ID, newPlan.Traffic, time.Now().Add(period), types.WorkspaceTrafficFromWorkspaceSubscription, renewalTransaction.ID.String())
		if err != nil {
			return fmt.Errorf("failed to add traffic package for workspace %s/%s: %w", workspace, regionDomain, err)
		}
		// 2. 变更quota

		// 3. 发送通知

		// Note: Backend controller will handle WorkspaceSubscription updates based on this transaction
		logrus.Infof("Successfully created renewal transaction for workspace %s/%s, backend controller will handle subscription updates", workspace, regionDomain)
		return nil
	})
}

// handleWorkspaceSubscriptionRenewalFailure handles automatic subscription renewal failure
//func handleWorkspaceSubscriptionRenewalFailure(event *stripe.Event) error {
//	// Parse invoice data from webhook event
//	invoiceData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
//	if err != nil {
//		return fmt.Errorf("failed to parse webhook data: %v", err)
//	}
//
//	invoice, ok := invoiceData.(*stripe.Invoice)
//	if !ok {
//		return fmt.Errorf("invalid invoice data type")
//	}
//
//	logrus.Infof("Processing workspace subscription renewal failure: %s", invoice.ID)
//
//	// Get subscription metadata
//	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
//		return fmt.Errorf("invoice has no associated subscription")
//	}
//
//	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
//
//	// Find workspace subscription by Stripe subscription ID
//	var workspaceSubscription types.WorkspaceSubscription
//	if err := dao.DBClient.GetGlobalDB().Where("stripe_subscription_id = ?", subscriptionID).First(&workspaceSubscription).Error; err != nil {
//		return fmt.Errorf("workspace subscription not found for Stripe subscription ID %s: %w", subscriptionID, err)
//	}
//
//	failureReason := fmt.Sprintf("Stripe renewal payment failed for invoice %s", invoice.ID)
//	logrus.Warnf("Renewal failure for workspace %s/%s: %s", workspaceSubscription.Workspace, workspaceSubscription.RegionDomain, failureReason)
//
//	// Database operations within transaction - only handle Transaction, not WorkspaceSubscription
//	// Backend controller will handle WorkspaceSubscription updates based on transaction status
//	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
//		// Try balance payment as fallback
//		account := types.Account{}
//		if err := tx.Where("userUid = ?", workspaceSubscription.UserUID).First(&account).Error; err != nil {
//			// TODO retry logic can be added here
//			logrus.Errorf("Failed to get account for user %s: %v", workspaceSubscription.UserUID, err)
//		} else if account.Balance-account.DeductionBalance >= invoice.AmountDue {
//			// Balance payment is possible - create successful renewal transaction
//			paymentID, err := gonanoid.New(12)
//			if err != nil {
//				return fmt.Errorf("failed to create payment id: %w", err)
//			}
//
//			// Create payment record for balance payment
//			payment := types.Payment{
//				ID: paymentID,
//				PaymentRaw: types.PaymentRaw{
//					UserUID:      workspaceSubscription.UserUID,
//					RegionUID:    dao.DBClient.GetLocalRegion().UID,
//					CreatedAt:    time.Now().UTC(),
//					Method:       helper.BALANCE,
//					Amount:       invoice.AmountDue,
//					TradeNO:      paymentID,
//					Type:         types.PaymentTypeSubscription,
//					ChargeSource: types.ChargeSourceBalance,
//					Status:       types.PaymentStatusPAID,
//					Message:      fmt.Sprintf("Fallback balance payment after Stripe failure for workspace %s/%s", workspaceSubscription.Workspace, workspaceSubscription.RegionDomain),
//				},
//			}
//
//			if err := tx.Create(&payment).Error; err != nil {
//				return fmt.Errorf("failed to create balance payment record: %w", err)
//			}
//
//			// Deduct balance
//			if err := cockroach.AddDeductionAccount(tx, workspaceSubscription.UserUID, invoice.AmountDue); err != nil {
//				return fmt.Errorf("failed to deduct balance: %w", err)
//			}
//
//			// Create successful renewal transaction
//			renewalTransaction := types.WorkspaceSubscriptionTransaction{
//				ID:            uuid.New(),
//				From:          types.TransactionFromAdmin, // System operation
//				Workspace:     workspaceSubscription.Workspace,
//				RegionDomain:  workspaceSubscription.RegionDomain,
//				UserUID:       workspaceSubscription.UserUID,
//				OldPlanName:   workspaceSubscription.PlanName,
//				NewPlanName:   workspaceSubscription.PlanName,
//				OldPlanStatus: workspaceSubscription.Status,
//				Operator:      types.SubscriptionTransactionTypeRenewed,
//				StartAt:       time.Now().UTC(),
//				CreatedAt:     time.Now().UTC(),
//				UpdatedAt:     time.Now().UTC(),
//				Status:        types.SubscriptionTransactionStatusPending,
//				StatusDesc:    "Renewed with balance payment after Stripe failure",
//				PayStatus:     types.SubscriptionPayStatusPaid,
//				PayID:         paymentID,
//				Period:        types.SubscriptionPeriodMonthly, // Default to monthly
//				Amount:        invoice.AmountDue,
//			}
//
//			if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &renewalTransaction); err != nil {
//				return fmt.Errorf("failed to create renewal transaction: %w", err)
//			}
//
//			logrus.Infof("Successfully created renewal transaction with balance payment for workspace %s/%s", workspaceSubscription.Workspace, workspaceSubscription.RegionDomain)
//			return nil
//		}
//
//		// Both Stripe and balance payment failed - create closure transaction
//		//paymentID, err := gonanoid.New(12)
//		//if err != nil {
//		//	return fmt.Errorf("failed to create payment id: %w", err)
//		//}
//		//
//
//		// TODO 处理失败的情况，将WorkspaceSubscription的PayStatus设置为Failed, 就不会自动扣费了
//		// 1. 失败了走 closure 逻辑
//
//		// Note: Backend controller will handle WorkspaceSubscription updates based on this transaction
//		logrus.Warnf("Created closure transaction for workspace %s/%s due to payment failures, backend controller will handle subscription updates", workspaceSubscription.Workspace, workspaceSubscription.RegionDomain)
//		return nil
//	})
//}

// handleWorkspaceSubscriptionClosure handles subscription cancellation/closure
func handleWorkspaceSubscriptionClosure(event *stripe.Event) error {
	// Parse subscription data from webhook event
	subscriptionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	subscription, ok := subscriptionData.(*stripe.Subscription)
	if !ok {
		return fmt.Errorf("invalid subscription data type")
	}

	logrus.Infof("Processing workspace subscription closure: %s", subscription.ID)

	// Get metadata from Stripe subscription
	workspace := subscription.Metadata["workspace"]
	regionDomain := subscription.Metadata["region_domain"]
	if workspace == "" || regionDomain == "" {
		return fmt.Errorf("missing required metadata in Stripe subscription")
	}

	// Find workspace subscription by Stripe subscription ID
	var workspaceSubscription types.WorkspaceSubscription
	if err := dao.DBClient.GetGlobalDB().Where(&types.WorkspaceSubscription{Workspace: workspace, RegionDomain: regionDomain}).First(&workspaceSubscription).Error; err != nil {
		return fmt.Errorf("workspace subscription not found for Stripe subscription ID %s: %w", subscription.ID, err)
	}

	// Database operations within transaction - only handle Transaction, not WorkspaceSubscription
	// Backend controller will handle WorkspaceSubscription updates based on transaction status
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Generate payment ID for tracking
		// TODO 删除PaymentOrder
		// 创建关闭 WorkspaceSubscriptionTransaction

		//workspaceSubTransaction := types.WorkspaceSubscriptionTransaction{
		//	ID:           uuid.New(),
		//	From:         types.TransactionFromUser, // System operation
		//	Workspace:    workspaceSubscription.Workspace,
		//	RegionDomain: workspaceSubscription.RegionDomain,
		//	UserUID:      workspaceSubscription.UserUID,
		//	OldPlanName:  workspaceSubscription.PlanName,
		//	NewPlanName:  "Free", // Default to Free plan on closure
		//}

		// Note: Backend controller will handle WorkspaceSubscription updates based on this transaction
		logrus.Infof("Successfully created closure transaction for workspace %s/%s, backend controller will handle subscription updates", workspaceSubscription.Workspace, workspaceSubscription.RegionDomain)
		return nil
	})
}

// Legacy functions below - these are no longer used in the new implementation
// They are kept for backward compatibility but should be removed in future versions

//func handleSubscriptionCreated(event *stripe.Event) error {
//	// This function is no longer used in the new implementation
//	logrus.Infof("handleSubscriptionCreated called but not processed - using new implementation")
//	return nil
//}
//
//func handleSubscriptionUpdated(event *stripe.Event) error {
//	// This function is no longer used in the new implementation
//	logrus.Infof("handleSubscriptionUpdated called but not processed - using new implementation")
//	return nil
//}

//func handleSubscriptionDeleted(event *stripe.Event) error {
//	// This function is now handled by handleWorkspaceSubscriptionClosure
//	logrus.Infof("handleSubscriptionDeleted called but redirecting to handleWorkspaceSubscriptionClosure")
//	return handleWorkspaceSubscriptionClosure(event)
//}

//func handleSubscriptionTrialWillEnd(event *stripe.Event) error {
//	subscriptionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
//	if err != nil {
//		return fmt.Errorf("failed to parse webhook data: %v", err)
//	}
//
//	subscription, ok := subscriptionData.(*stripe.Subscription)
//	if !ok {
//		return fmt.Errorf("invalid subscription data type")
//	}
//
//	logrus.Infof("Processing subscription trial will end: %s", subscription.ID)
//
//	// This function is no longer used in the new implementation
//	logrus.Infof("handleSubscriptionTrialWillEnd called but not processed - using new implementation")
//	return nil
//}

//func handleInvoicePaymentSucceeded(event *stripe.Event) error {
//	invoiceData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
//	if err != nil {
//		return fmt.Errorf("failed to parse webhook data: %v", err)
//	}
//
//	invoice, ok := invoiceData.(*stripe.Invoice)
//	if !ok {
//		return fmt.Errorf("invalid invoice data type")
//	}
//
//	logrus.Infof("Processing invoice payment succeeded: %s", invoice.ID)
//
//	// Handle successful recurring payments - extend subscription
//	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
//		return fmt.Errorf("invoice has no associated subscription")
//	}
//
//	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
//	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
//		// Find workspace subscription
//		workspaceSubscription := &types.WorkspaceSubscription{}
//		if err := tx.Where("stripe_subscription_id = ?", subscriptionID).First(workspaceSubscription).Error; err != nil {
//			logrus.Warnf("Could not find workspace subscription for Stripe subscription %s: %v", subscriptionID, err)
//			return nil
//		}
//
//		// Extend subscription period
//		now := time.Now().UTC()
//		var newExpireAt time.Time
//
//		// If subscription is still active, extend from current expire time
//		if workspaceSubscription.ExpireAt.After(now) {
//			newExpireAt = workspaceSubscription.ExpireAt.AddDate(0, 1, 0) // Extend by 1 month (default)
//		} else {
//			// If expired, start from now
//			newExpireAt = now.AddDate(0, 1, 0)
//		}
//
//		// Update subscription
//		if err := tx.Model(workspaceSubscription).Updates(map[string]interface{}{
//			"status":    types.SubscriptionStatusNormal,
//			"expire_at": newExpireAt,
//			"update_at": now,
//		}).Error; err != nil {
//			return fmt.Errorf("failed to extend workspace subscription: %v", err)
//		}
//
//		// Create renewal transaction record
//		renewalTransaction := &types.WorkspaceSubscriptionTransaction{
//			ID:           uuid.New(),
//			Workspace:    workspaceSubscription.Workspace,
//			RegionDomain: workspaceSubscription.RegionDomain,
//			UserUID:      workspaceSubscription.UserUID,
//			Amount:       invoice.AmountPaid,
//			// Operator:     types.SubscriptionOperatorRenewal,
//			PayStatus: types.SubscriptionPayStatusPaid,
//			Status:    types.SubscriptionTransactionStatusCompleted,
//			PayID:     invoice.ID,
//			CreatedAt: now,
//			StartAt:   now,
//		}
//
//		if err := tx.Create(renewalTransaction).Error; err != nil {
//			return fmt.Errorf("failed to create renewal transaction: %v", err)
//		}
//
//		// Create payment record for recurring payment
//		payment := &types.Payment{
//			ID: invoice.ID,
//			PaymentRaw: types.PaymentRaw{
//				UserUID:      workspaceSubscription.UserUID,
//				Amount:       invoice.AmountPaid,
//				Method:       helper.STRIPE,
//				RegionUID:    dao.DBClient.GetLocalRegion().UID,
//				TradeNO:      invoice.ID,
//				Type:         types.PaymentTypeSubscription,
//				ChargeSource: types.ChargeSourceBindCard,
//			},
//		}
//
//		if err := tx.Create(payment).Error; err != nil {
//			return fmt.Errorf("failed to create payment record: %v", err)
//		}
//
//		logrus.Infof("Extended workspace subscription %s until %v", workspaceSubscription.Workspace, newExpireAt)
//		return nil
//	})
//}

//func handleInvoicePaymentFailed(event *stripe.Event) error {
//	invoiceData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
//	if err != nil {
//		return fmt.Errorf("failed to parse webhook data: %v", err)
//	}
//
//	invoice, ok := invoiceData.(*stripe.Invoice)
//	if !ok {
//		return fmt.Errorf("invalid invoice data type")
//	}
//
//	logrus.Infof("Processing invoice payment failed: %s", invoice.ID)
//
//	// Handle failed payments - update status and notify
//	if invoice.Parent == nil || invoice.Parent.SubscriptionDetails == nil || invoice.Parent.SubscriptionDetails.Subscription == nil {
//		return fmt.Errorf("invoice has no associated subscription")
//	}
//
//	subscriptionID := invoice.Parent.SubscriptionDetails.Subscription.ID
//	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
//		// Find workspace subscription
//		workspaceSubscription := &types.WorkspaceSubscription{}
//		if err := tx.Where("stripe_subscription_id = ?", subscriptionID).First(workspaceSubscription).Error; err != nil {
//			logrus.Warnf("Could not find workspace subscription for Stripe subscription %s: %v", subscriptionID, err)
//			return nil
//		}
//
//		// Create failed payment transaction record
//		failedTransaction := &types.WorkspaceSubscriptionTransaction{
//			ID:           uuid.New(),
//			Workspace:    workspaceSubscription.Workspace,
//			RegionDomain: workspaceSubscription.RegionDomain,
//			UserUID:      workspaceSubscription.UserUID,
//			Amount:       invoice.AmountDue,
//			// Operator:     types.SubscriptionOperatorRenewal,
//			PayStatus: types.SubscriptionPayStatusFailed,
//			Status:    types.SubscriptionTransactionStatusFailed,
//			PayID:     invoice.ID,
//			CreatedAt: time.Now().UTC(),
//			StartAt:   time.Now().UTC(),
//		}
//
//		if err := tx.Create(failedTransaction).Error; err != nil {
//			return fmt.Errorf("failed to create failed transaction: %v", err)
//		}
//
//		// TODO: Send payment failure notification email to user
//		logrus.Errorf("Payment failed for workspace subscription %s, amount: %d", workspaceSubscription.Workspace, invoice.AmountDue)
//		return nil
//	})
//}

// CreateWorkspaceSubscriptionPortalSession creates a customer portal session for subscription management
// @Summary Create customer portal session
// @Description Create Stripe customer portal session for workspace subscription management
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body WorkspaceSubscriptionInfoReq true "WorkspaceSubscriptionInfoReq"
// @Success 200 {object} PortalSessionResp
// @Router /payment/v1alpha1/workspace-subscription/portal-session [post]
func CreateWorkspaceSubscriptionPortalSession(c *gin.Context) {
	req, err := helper.ParseWorkspaceSubscriptionInfoReq(c)
	if err != nil {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		SetErrorResp(c, http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	if services.StripeServiceInstance == nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": "Stripe service not configured"})
		return
	}

	// Get or create customer
	customer, err := services.StripeServiceInstance.GetCustomer(req.UserUID.String(), "")
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get/create customer: %v", err)})
		return
	}

	// Create portal session
	portalSession, err := services.StripeServiceInstance.CreatePortalSession(customer.ID)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create portal session: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"url":     portalSession.URL,
		"success": true,
	})
}

// sendWorkspaceSubscriptionEmail sends email notification for workspace subscription events
// Following the pattern from subscription.go's sendUserPayEmail
func sendWorkspaceSubscriptionEmail(userUID uuid.UUID, emailType string) error {
	if dao.EmailTmplMap[emailType] == "" {
		return fmt.Errorf("email type %s is invalid", emailType)
	}

	tx := dao.DBClient.GetGlobalDB()
	var emailProvider types.OauthProvider
	var userInfo types.UserInfo

	err := dao.DBClient.GetGlobalDB().Where(&types.OauthProvider{UserUID: userUID, ProviderType: types.OauthProviderTypeEmail}).First(&emailProvider).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to get email provider: %w", err)
	}

	if err == gorm.ErrRecordNotFound {
		return fmt.Errorf("email provider is not found")
	}

	if emailProvider.ProviderID != "" {
		err = tx.Where(types.UserInfo{UserUID: userUID}).Find(&userInfo).Error
		if err != nil {
			return fmt.Errorf("failed to get user info: %w", err)
		}

		// TODO: Implement email template rendering for workspace subscriptions
		// Similar to subscription.go's email handling
		logrus.Infof("TODO: Send %s email to user %s", emailType, userUID)
	}

	return nil
}
