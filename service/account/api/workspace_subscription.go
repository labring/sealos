package api

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"strings"
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
	if err := authenticateWorkspaceSubscriptionRequest(c, req, false); err != nil {
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
	if err := authenticateWorkspaceSubscriptionRequest(c, req, true); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	subscription, err := dao.DBClient.GetWorkspaceSubscription(req.Workspace, req.RegionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription info: %v", err)})
		return
	}
	if subscription == nil {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	if subscription.Status == types.SubscriptionStatusDeleted {
		c.JSON(http.StatusOK, gin.H{})
		return
	}
	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// TODO 更新订阅状态
		needCancel := subscription.PayStatus == types.SubscriptionPayStatusPaid
		subscription.Status = types.SubscriptionStatusDeleted
		subscription.PayStatus = types.SubscriptionPayStatusCanceled
		subscription.CancelAt = time.Now().UTC()
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
		}
		if subscription.Stripe != nil && subscription.Stripe.SubscriptionID != "" {
			transaction.StatusDesc = "Canceled by user with stripe: " + subscription.Stripe.SubscriptionID
		}
		if err = tx.Create(&transaction).Error; err != nil {
			return err
		}
		if needCancel {
			if subscription.PayMethod == types.PaymentMethodStripe && subscription.Stripe.SubscriptionID != "" {
				if sub, err := services.StripeServiceInstance.CancelSubscription(subscription.Stripe.SubscriptionID); err != nil {
					if sub == nil || sub.Status != stripe.SubscriptionStatusCanceled {
						return err
					}
				}
			}
		}
		return nil
	})
	if err != nil {
		dao.Logger.Errorf("failed to delete workspace subscription info: %v", err)
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to delete workspace subscription: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{})
}

func DeleteAccount(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	// 获取用户的所有工作空间订阅
	subList, err := dao.DBClient.ListWorkspaceSubscription(req.UserUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get workspace subscription list: %v", err)})
		return
	}

	if len(subList) == 0 {
		c.JSON(http.StatusOK, gin.H{
			"message": "No active workspace subscriptions found",
			"success": true,
		})
		return
	}

	// 检查是否已经存在待处理的删除事务
	lastTransactions, err := dao.DBClient.GetAllUnprocessedWorkspaceSubscriptionTransaction(req.UserUID)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get unprocessed transactions: %v", err)})
		return
	}
	if len(lastTransactions) > 0 {
		// 修改所有的待处理事务为取消状态
		var unprocessedIDs []uuid.UUID
		for j := range lastTransactions {
			unprocessedIDs = append(unprocessedIDs, lastTransactions[j].ID)
		}
		db := dao.DBClient.GetGlobalDB()
		if err := db.Model(&types.WorkspaceSubscriptionTransaction{}).
			Where("id IN ?", unprocessedIDs).
			Updates(map[string]interface{}{
				"status":      types.SubscriptionTransactionStatusCanceled,
				"status_desc": "Canceled due to account deletion request",
			}).Error; err != nil {
			// fmt.Errorf("failed to cancel unprocessed transactions for user %s/%s: %w", req.UserID, req.UserUID, err)
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to cancel unprocessed transactions: %v", err)})
			return
		}
	}

	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		//var createdTransactions []types.WorkspaceSubscriptionTransaction
		var createdTransactionsLen int

		for i := range subList {
			if subList[i].Status == types.SubscriptionStatusDeleted {
				continue
			}

			//if lastTransaction != nil &&
			//   lastTransaction.Operator == types.SubscriptionTransactionTypeDeleted &&
			//   (lastTransaction.Status == types.SubscriptionTransactionStatusPending ||
			//    lastTransaction.Status == types.SubscriptionTransactionStatusProcessing) {
			//	continue
			//}

			now := time.Now().UTC()
			deleteTransaction := types.WorkspaceSubscriptionTransaction{
				ID:            uuid.New(),
				From:          types.TransactionFromUser,
				Workspace:     subList[i].Workspace,
				RegionDomain:  subList[i].RegionDomain,
				UserUID:       req.UserUID,
				OldPlanName:   subList[i].PlanName,
				OldPlanStatus: subList[i].Status,
				NewPlanName:   subList[i].PlanName, // 删除时新旧计划名称相同
				Operator:      types.SubscriptionTransactionTypeDeleted,
				StartAt:       now,
				CreatedAt:     now,
				UpdatedAt:     now,
				Status:        types.SubscriptionTransactionStatusPending,
				PayStatus:     types.SubscriptionPayStatusNoNeed, // 删除操作无需付费
				StatusDesc:    "Account cancellation requested by user",
				Amount:        0, // 删除操作无费用
			}

			if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &deleteTransaction); err != nil {
				return fmt.Errorf("failed to create deletion transaction for workspace %s/%s: %w",
					subList[i].Workspace, subList[i].RegionDomain, err)
			}

			createdTransactionsLen++
			logrus.Infof("Created deletion transaction for workspace subscription: workspace=%s, region=%s, transaction_id=%s",
				subList[i].Workspace, subList[i].RegionDomain, deleteTransaction.ID)
		}

		if createdTransactionsLen > 0 {
			logrus.Infof("Account cancellation initiated for user %s: created %d deletion transactions",
				req.UserUID, createdTransactionsLen)
		}

		return nil
	})

	if err != nil {
		dao.Logger.Errorf("failed to cancel account for user %s: %v", req.UserUID, err)
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to cancel account: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Account cancellation has been initiated. All workspace subscriptions will be processed for deletion.",
	})
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
	type WorkspaceSubscription struct {
		*types.WorkspaceSubscription
		Amount int64 `json:"amount"`
	}
	var workspaceSubscriptions = make([]WorkspaceSubscription, len(subscriptions))
	for i := range subscriptions {
		workspaceSubscriptions[i] = WorkspaceSubscription{
			WorkspaceSubscription: &subscriptions[i],
			Amount:                0,
		}
		if subscriptions[i].PlanName == types.FreeSubscriptionPlanName {
			continue
		}
		price, err := dao.DBClient.GetWorkspaceSubscriptionPlanPrice(subscriptions[i].PlanName, types.SubscriptionPeriodMonthly)
		if err != nil {
			logrus.Warnf("failed to get workspace subscription plan price: %v", err)
			continue
		}
		if price != nil {
			workspaceSubscriptions[i].Amount = price.Price
		}
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
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error: %v", err)})
		return
	}

	type WorkspaceSubscriptionPayment struct {
		ID        string    `gorm:"column:id"`
		Time      time.Time `gorm:"column:time"`
		Amount    int64     `gorm:"column:amount"`
		PlanName  string    `gorm:"column:plan_name"`
		Workspace string    `gorm:"column:workspace"`
		Operator  string    `gorm:"column:operator"`
		Type      string    `gorm:"column:type"`
	}

	var payments []WorkspaceSubscriptionPayment

	// Query using GORM with LEFT JOIN to include all payments
	query := dao.DBClient.GetGlobalDB().
		Model(&types.Payment{}).
		Select(`"Payment".created_at AS time,
                "Payment".id AS id,
                "Payment".amount AS amount,
                "WorkspaceSubscriptionTransaction".new_plan_name AS plan_name,
                "WorkspaceSubscriptionTransaction".workspace AS workspace,
                "WorkspaceSubscriptionTransaction".operator AS operator,
                COALESCE("Payment".type, 'ACCOUNT_RECHARGE') AS type`).
		Joins(`LEFT JOIN "WorkspaceSubscriptionTransaction" ON "Payment".id = "WorkspaceSubscriptionTransaction".pay_id`).
		Where(`"Payment".status = ? AND "Payment"."userUid" = ?`, types.PaymentStatusPAID, req.UserUID)

	// Add time range filter if StartTime and EndTime are valid
	if !req.TimeRange.StartTime.IsZero() && !req.TimeRange.EndTime.IsZero() {
		query = query.Where(`"Payment".created_at BETWEEN ? AND ?`, req.TimeRange.StartTime, req.TimeRange.EndTime)
	}

	// Add sorting to ensure consistent order
	query = query.Order(`"Payment".created_at DESC`)

	err = query.Scan(&payments).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to query payments: %v", err)})
		return
	}
	// Ensure payments is never nil
	if payments == nil {
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
	if err := authenticateWorkspaceSubscriptionRequest(c, req, false); err != nil {
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
	if err := authenticateWorkspaceSubscriptionOperatorRequest(c, req); err != nil {
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

	if currentSubscription.PayMethod == types.PaymentMethodStripe && currentSubscription.PayStatus == types.SubscriptionPayStatusPaid && currentSubscription.Stripe != nil {
		price := getCurrentWorkspacePlanPrice(targetPlan, req.Period)
		if price == nil || price.StripePrice == nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("no price found for target plan %s and period %s", targetPlan.Name, req.Period)})
			return
		}
		amount, err := services.StripeServiceInstance.UpdatePlanPricePreview(currentSubscription.Stripe.SubscriptionID, *price.StripePrice)
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get upgrade amount from stripe: %v", err)})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"amount": amount * 10_000, // Convert cents to dollars
		})
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
	if err := authenticateWorkspaceSubscriptionOperatorRequest(c, req); err != nil {
		SetErrorResp(c, http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err), "code": http.StatusUnauthorized})
		return
	}

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
	currentPlanPrice := getCurrentWorkspacePlanPrice(currentPlan, req.Period)
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
		if currentSubscription != nil && currentSubscription.PlanName != types.FreeSubscriptionPlanName {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot create new subscription with existing subscription"})
			return
		}
		transaction.Amount = planPrice.Price // Full price for new subscription
	case types.SubscriptionTransactionTypeUpgraded:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot upgrade without existing subscription"})
			return
		}
		if currentPlan == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot upgrade without existing plan"})
			return
		}
		if !contain(currentPlan.UpgradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in upgrade plan list: %v", currentPlan.UpgradePlanList)})
			return
		}
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

	case types.SubscriptionTransactionTypeDowngraded:
		if currentSubscription == nil {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "cannot downgrade without existing subscription"})
			return
		}
		if currentPlan != nil && !contain(currentPlan.DowngradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in downgrade plan list: %v", currentPlan.DowngradePlanList)})
			return
		}
		transaction.StartAt = currentSubscription.CurrentPeriodEndAt.Add(-20 * time.Minute)
		// Downgrade takes effect at next cycle and typically has no cost
		if transaction.StartAt.Before(time.Now()) {
			transaction.StartAt = time.Now()
		}
		transaction.Status = types.SubscriptionTransactionStatusPending
		transaction.PayStatus = types.SubscriptionPayStatusUnpaid
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
	if err != nil && !errors.Is(err, ErrSamePendingOperation) {
		// logrus.Errorf("handle workspace subscription transaction error: %v", err)
		dao.Logger.Errorf("handle workspace subscription transaction error: %v", err)
		// Error response already handled in the function
		return
	}
}

// Helper functions for workspace subscription payment logic

var ErrSamePendingOperation = errors.New("same pending operation exists")

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
					if strings.ToLower(string(req.PayMethod)) == helper.STRIPE {
						// 对于 Stripe 支付，检查 PaymentOrder 状态
						var paymentOrder types.PaymentOrder
						if err := tx.Where("id = ?", lastTransaction.PayID).First(&paymentOrder).Error; err == nil {
							if paymentOrder.Status == types.PaymentOrderStatusPending && paymentOrder.CodeURL != "" {
								// Session 仍然有效，返回上次的支付链接
								logrus.Infof("Returning existing Stripe session for same request: %s", paymentOrder.CodeURL)
								c.JSON(http.StatusOK, gin.H{
									"redirectUrl": paymentOrder.CodeURL,
									"payID":       paymentOrder.ID,
									"success":     true,
								})
								return ErrSamePendingOperation
							}
						}
					}
				}
				// 如果上次session已经失效，继续处理下面的逻辑
			} else if lastTransaction.PayStatus == types.SubscriptionPayStatusPending {
				// 不同请求，需要关闭/取消/等待 上次的请求完成后在处理下次
				logrus.Infof("Different request detected, canceling previous transaction. Old: plan=%s, operator=%s, period=%s; New: plan=%s, operator=%s, period=%s",
					lastTransaction.NewPlanName, lastTransaction.Operator, lastTransaction.Period,
					req.PlanName, req.Operator, req.Period)
				var paymentOrder types.PaymentOrder
				if lastTransaction.PayID != "" {
					if err := tx.Where("id = ?", lastTransaction.PayID).First(&paymentOrder).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
						return fmt.Errorf("failed to get last payment order: %v", err)
					}
				}
				// TODO 需要调用 stripe.Api去取消交易，防止重复调用
				if paymentOrder.Stripe != nil && paymentOrder.Stripe.SessionID != "" {
					// 标记上次交易为已取消
					if err := tx.Model(&lastTransaction).Updates(map[string]interface{}{
						"status":      types.SubscriptionTransactionStatusFailed,
						"pay_status":  types.SubscriptionPayStatusCanceled,
						"status_desc": "Canceled due to new different request",
					}).Error; err != nil {
						return fmt.Errorf("failed to cancel previous transaction: %v", err)
					}

					if err := tx.Model(&types.PaymentOrder{}).Where("id = ?", lastTransaction.PayID).Update("status", types.PaymentStatusExpired).Error; err != nil {
						logrus.Errorf("Failed to cancel previous payment order: %v", err)
					}
					if err := services.StripeServiceInstance.CancelWorkspaceSubscriptionSession(paymentOrder.Stripe.SessionID); err != nil {
						return fmt.Errorf("failed to cancel workspace subscription session: %v", err)
					}
				} else {
					c.JSON(http.StatusConflict, gin.H{"error": "a different subscription operation is still pending, please wait for it to complete"})
					return fmt.Errorf("different pending operation exists")
				}
			} else {
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
		}

		return nil // Validation passed, continue with payment processing
	}, func(tx *gorm.DB) error {
		// Process payment based on amount and method
		if transaction.Amount > 0 || req.Operator == types.SubscriptionTransactionTypeUpgraded {
			ok, err := CheckQuota(context.Background(), req.Workspace, transaction.NewPlanName)
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to check quota: %v", err)})
				return err
			}
			if !ok {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": "quota exceeded for the requested plan, please change the resource usage to within the expected workspace subscription quota", "code": 10004})
				return fmt.Errorf("workspace %s quota exceeded for the requested plan: %s", transaction.Workspace, transaction.NewPlanName)
			}
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
			return processNoPaymentOperationInTransaction(tx, c, subscription, req, transaction)
		}
	})
}

func getCurrentWorkspacePlanPrice(plan *types.WorkspaceSubscriptionPlan, period types.SubscriptionPeriod) *types.ProductPrice {
	if plan == nil {
		return nil
	}
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

	// Create transaction record first
	transaction.Status = types.SubscriptionTransactionStatusProcessing
	transaction.PayStatus = types.SubscriptionPayStatusPending
	if err := dao.DBClient.CreateWorkspaceSubscriptionTransaction(tx, &transaction); err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to create workspace subscription transaction: %v", err)})
		return err
	}

	// No payment order for subscription update (handled via invoice webhook)
	// Update Stripe subscription - this will trigger proration invoice
	// Ensure metadata is set for webhook identification (assume UpdatePlan handles metadata update with pay_id, operator, etc.)
	stripeResp, err := services.StripeServiceInstance.UpdatePlan(subscription.Stripe.SubscriptionID, *price.StripePrice, transaction.NewPlanName, transaction.PayID)
	if err != nil {
		// If update fails, mark transaction as failed
		transaction.Status = types.SubscriptionTransactionStatusFailed
		transaction.PayStatus = types.SubscriptionPayStatusFailed
		transaction.StatusDesc = fmt.Sprintf("Failed to update Stripe subscription: %v", err)
		tx.Save(&transaction)
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to update Stripe subscription: %v", err)})
		return err
	}

	// Update transaction to pending awaiting webhook confirmation
	transaction.Status = types.SubscriptionTransactionStatusPending
	tx.Save(&transaction)

	logrus.Infof("workspace: %s, Stripe subscription updated: %s, status: %s, awaiting webhook confirmation", subscription.Workspace, stripeResp.ID, stripeResp.Status)

	// Return response indicating upgrade initiated
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Subscription upgrade initiated, payment processing via webhook",
	})
	return nil
}

// processUpgradeSubscription handles subscription upgrades
//func processUpgradeSubscription(tx *gorm.DB, c *gin.Context, req *helper.WorkspaceSubscriptionOperatorReq, subscription *types.WorkspaceSubscription, price *types.ProductPrice, transaction types.WorkspaceSubscriptionTransaction) error {
//	// Handle upgrade from Free plan (new subscription creation)
//	if transaction.OldPlanName == types.FreeSubscriptionPlanName {
//		return processNewSubscription(tx, c, req, price, transaction)
//	}
//
//	// Handle upgrade from paid plan (subscription modification)
//	if price == nil || price.StripePrice == nil {
//		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": "new plan has no valid Stripe price"})
//		return fmt.Errorf("new plan has no valid Stripe price")
//	}
//
//	workspace, regionDomain := req.Workspace, req.RegionDomain
//	err := dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
//		// Update existing Stripe subscription
//		stripeResp, err := services.StripeServiceInstance.UpdatePlan(subscription.Stripe.SubscriptionID, *price.StripePrice, transaction.NewPlanName, transaction.PayID)
//		if err != nil {
//			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to update Stripe subscription: %v", err)})
//			return err
//		}
//		targetPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(req.PlanName)
//		if err != nil {
//			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get target plan: %v", err)})
//			return err
//		}
//		pri := getCurrentWorkspacePlanPrice(targetPlan, req.Period)
//		if pri == nil || pri.StripePrice == nil {
//			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("no price found for target plan %s and period %s", targetPlan.Name, req.Period)})
//			return fmt.Errorf("no price found for target plan %s and period %s", targetPlan.Name, req.Period)
//		}
//		amount, err := services.StripeServiceInstance.UpdatePlanPricePreview(subscription.Stripe.SubscriptionID, *price.StripePrice)
//		if err != nil {
//			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get upgrade amount from stripe: %v", err)})
//			return fmt.Errorf("failed to get upgrade amount from stripe: %v", err)
//		}
//		//stripeResp.LatestInvoice.AmountPaid
//		data, _ := json.MarshalIndent(stripeResp, "", "  ")
//		fmt.Printf("stripe Resp: %s\n", string(data))
//		payment := &types.Payment{
//			ID: transaction.PayID,
//			PaymentRaw: types.PaymentRaw{
//				Stripe:    subscription.Stripe,
//				UserUID:   req.UserUID,
//				RegionUID: dao.DBClient.GetLocalRegion().UID,
//				CreatedAt: time.Now().UTC(),
//				Method:    helper.STRIPE,
//				// amount invoice.AmountPaid / 10_000
//				Amount:                  amount * 10_000,
//				TradeNO:                 stripeResp.LatestInvoice.ID,
//				Type:                    types.PaymentTypeSubscription,
//				ChargeSource:            types.ChargeSourceStripe,
//				Status:                  types.PaymentStatusPAID,
//				WorkspaceSubscriptionID: &subscription.ID,
//				Message:                 fmt.Sprintf("Payment for workspace %s/%s (%s)", workspace, regionDomain, stripeResp.LatestInvoice.BillingReason),
//			},
//		}
//		err = finalizeWorkspaceSubscriptionSuccess(tx, subscription, &transaction, payment, false)
//		if err != nil {
//			return fmt.Errorf("failed to finalize subscription payment: %v", err)
//		}
//		logrus.Infof("workspace: %s, Stripe subscription updated: %s, status: %s", subscription.Workspace, stripeResp.ID, stripeResp.Status)
//		return nil
//	})
//	if err != nil {
//		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to process upgrade: %v", err)})
//		return fmt.Errorf("failed to update Stripe subscription: %v", err)
//	}
//	c.JSON(http.StatusOK, gin.H{
//		"success": true,
//		"message": "Subscription upgraded successfully, waiting for update",
//	})
//	return nil
//}

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
	// Get or create Stripe customer ID
	//customer, err := services.StripeServiceInstance.GetCustomerByUID(req.UserUID.String())
	//if err != nil {
	//	SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get or create stripe customer: %v", err)})
	//	return err
	//}
	//paymentReq.CustomerID = &customer.ID
	customerID, err := dao.DBClient.GetUserStripeCustomerID(req.UserUID)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get user stripe customer id: %v", err)})
		return err
	}
	if customerID != "" {
		paymentReq.CustomerID = &customerID
	} else {
		dao.Logger.Infof("get user stripe customer id empty: %v", req.UserUID)
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
			Method:       req.PayMethod,
			RegionUID:    dao.DBClient.GetLocalRegion().UID,
			TradeNO:      paymentReq.RequestID,
			CodeURL:      stripeResp.URL,
			Type:         types.PaymentTypeSubscription,
			ChargeSource: types.ChargeSourceStripe,
			Stripe: &types.StripePay{
				SessionID: stripeResp.SessionID,
			},
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
		"payID":       transaction.PayID,
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
			Method:       req.PayMethod,
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
func processNoPaymentOperationInTransaction(tx *gorm.DB, c *gin.Context, subscription *types.WorkspaceSubscription, req *helper.WorkspaceSubscriptionOperatorReq, transaction types.WorkspaceSubscriptionTransaction) error {
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
		transaction.StartAt = subscription.CurrentPeriodEndAt.Add(-1 * time.Hour) // Buffer time before period end
		if subscription.PayMethod == types.PaymentMethodStripe && subscription.Stripe != nil && subscription.Stripe.SubscriptionID != "" {
			currentPeriodEnd, err := services.StripeServiceInstance.GetSubscriptionCurrentPeriodEnd(subscription.Stripe.SubscriptionID)
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get Stripe subscription current period end: %v", err)})
				return err
			}
			transaction.StartAt = currentPeriodEnd.Add(-1 * time.Hour) // Buffer time before period end
			transaction.PayStatus = types.SubscriptionPayStatusUnpaid
		}
	default:
		// Immediate operations (like free plan creation)
		transaction.Status = types.SubscriptionTransactionStatusCompleted
	}

	fmt.Printf("Processing operation: %#+v\n", transaction)
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
		// logrus.Errorf("Failed to process workspace subscription webhook event %s: %v", event.Type, err)
		dao.Logger.Errorf("Failed to process workspace subscription webhook event %s: %v", event.Type, err)
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
	case "customer.subscription.deleted":
		return handleWorkspaceSubscriptionDeleted(event)
	case "checkout.session.expired":
		return handleWorkspaceSubscriptionSessionExpired(event)
	default:
		logrus.Infof("Unhandled workspace subscription webhook event type: %s", event.Type)
		return nil
	}
	return nil
}

func checkIsLocalEvent(event interface{}) (bool, error) {
	switch e := event.(type) {
	//case *stripe.Invoice:
	//	if e.Metadata == nil || e.Metadata["region_domain"] == "" {
	//		return false, fmt.Errorf("invoice has no associated region domain")
	//	}
	//	if e.Metadata["region_domain"] != dao.DBClient.GetLocalRegion().Domain {
	//		return false, nil
	//	}
	//	return true, nil
	case *stripe.Subscription:
		if e.Metadata == nil || e.Metadata["region_domain"] == "" {
			// TODO 兼容老数据
			dao.Logger.Infof("Subscription has no associated region domain, assuming local for backward compatibility")
			return false, nil
		}
		if e.Metadata["region_domain"] != dao.DBClient.GetLocalRegion().Domain {
			return false, nil
		}
		return true, nil
	case *stripe.CheckoutSession:
		if e.Metadata == nil || e.Metadata["region_domain"] == "" {
			return false, nil
		}
		if e.Metadata["region_domain"] != dao.DBClient.GetLocalRegion().Domain {
			return false, nil
		}
		return true, nil
	default:
		return false, fmt.Errorf("unsupported event data type")
	}
}

func updateWorkspaceSubscriptionQuota(planName, workspace string) error {
	res := dao.WorkspacePlanResQuota[planName].DeepCopy()
	// TODO 需要考虑默认的其他quota限制，nodeport等
	nsQuota := resources.GetDefaultResourceQuota(workspace, "quota-"+workspace)
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

	if err = updateDebtNamespaceStatus(context.Background(), dao.K8sManager.GetClient(), ResumeDebtNamespaceAnnoStatus, []string{workspace}); err != nil {
		return fmt.Errorf("failed to update namespace status: %w", err)
	}
	return nil
}

// Helper function to finalize successful payment processing
// This abstracts common logic for updating subscription, quota, and traffic
func finalizeWorkspaceSubscriptionSuccess(tx *gorm.DB, workspaceSubscription *types.WorkspaceSubscription, wsTransaction *types.WorkspaceSubscriptionTransaction, payment *types.Payment) error {
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
	var workspaceSubscriptionID uuid.UUID
	if workspaceSubscription != nil {
		workspaceSubscriptionID = workspaceSubscription.ID
		workspaceSubscription.CancelAtPeriodEnd = false
		workspaceSubscription.Status = types.SubscriptionStatusNormal
	} else {
		workspaceSubscriptionID = uuid.New()
	}
	payment.WorkspaceSubscriptionID = &workspaceSubscriptionID
	wsTransaction.Status = types.SubscriptionTransactionStatusCompleted
	wsTransaction.Amount = payment.Amount
	wsTransaction.PayStatus = types.SubscriptionPayStatusPaid
	// Create or update transaction
	if wsTransaction.Operator == types.SubscriptionTransactionTypeCreated || wsTransaction.Operator == types.SubscriptionTransactionTypeUpgraded || wsTransaction.Operator == types.SubscriptionTransactionTypeDowngraded {
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
		workspaceSubscription.PayMethod = payment.Method
		if payment.Stripe != nil {
			workspaceSubscription.Stripe = payment.Stripe
		}
	} else {
		// Create new for initial if not exists
		workspaceSubscription = &types.WorkspaceSubscription{
			ID:                   workspaceSubscriptionID,
			PlanName:             wsTransaction.NewPlanName,
			Workspace:            wsTransaction.Workspace,
			RegionDomain:         wsTransaction.RegionDomain,
			UserUID:              wsTransaction.UserUID,
			Status:               types.SubscriptionStatusNormal,
			TrafficStatus:        types.WorkspaceTrafficStatusActive,
			PayStatus:            types.SubscriptionPayStatusPaid,
			PayMethod:            payment.Method,
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
		workspaceSubscription.CurrentPeriodStartAt = time.Now().UTC()
		workspaceSubscription.CurrentPeriodEndAt = time.Now().UTC().AddDate(0, 1, 0)
		workspaceSubscription.ExpireAt = stripe.Time(workspaceSubscription.CurrentPeriodEndAt)
	}

	if err := tx.Save(workspaceSubscription).Error; err != nil {
		return fmt.Errorf("failed to save workspace subscription: %w", err)
	}

	// Update resource quota for create or upgrade
	if wsTransaction.Operator != types.SubscriptionTransactionTypeRenewed {
		if err := updateWorkspaceSubscriptionQuota(wsTransaction.NewPlanName, workspaceSubscription.Workspace); err != nil {
			return fmt.Errorf("failed to create or update resource quota: %w", err)
		}
	}

	// Add traffic package
	plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(wsTransaction.NewPlanName)
	if err != nil {
		return fmt.Errorf("failed to get workspace subscription plan: %w", err)
	}
	traffic := plan.Traffic
	aiQuota := plan.AIQuota
	if (wsTransaction.Operator == types.SubscriptionTransactionTypeUpgraded || wsTransaction.Operator == types.SubscriptionTransactionTypeRenewed) && oldPlanName != "" && oldPlanName != types.FreeSubscriptionPlanName && oldPlanName != wsTransaction.NewPlanName {
		oldPlan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(oldPlanName)
		if err != nil {
			return fmt.Errorf("failed to get old workspace subscription plan: %w", err)
		}
		traffic -= oldPlan.Traffic
		if traffic < 0 {
			traffic = 0
		}
		aiQuota -= oldPlan.AIQuota
		if aiQuota < 0 {
			aiQuota = 0
		}
	}
	if wsTransaction.Period == "" {
		wsTransaction.Period = types.SubscriptionPeriodMonthly
	}
	if wsTransaction.Operator != types.SubscriptionTransactionTypeDowngraded {
		if traffic > 0 {
			period, err := types.ParsePeriod(wsTransaction.Period)
			if err != nil {
				return fmt.Errorf("invalid subscription period: %w", err)
			}
			err = helper.AddTrafficPackage(tx, dao.K8sManager.GetClient(), workspaceSubscription, plan, time.Now().Add(period), types.WorkspaceTrafficFromWorkspaceSubscription, wsTransaction.ID.String())
			//err = dao.AddWorkspaceSubscriptionTrafficPackage(tx, workspaceSubscription.ID, traffic, workspaceSubscription.CurrentPeriodEndAt, types.WorkspaceTrafficFromWorkspaceSubscription, wsTransaction.ID.String())
			if err != nil {
				return fmt.Errorf("failed to add traffic package: %w", err)
			}
		}
		if aiQuota > 0 {
			period, err := types.ParsePeriod(wsTransaction.Period)
			if err != nil {
				return fmt.Errorf("invalid subscription period: %w", err)
			}
			err = cockroach.AddWorkspaceSubscriptionAIQuotaPackage(tx, workspaceSubscription.ID, plan.AIQuota, time.Now().Add(period), types.PKGFromWorkspaceSubscription, wsTransaction.ID.String())
			if err != nil {
				return fmt.Errorf("failed to add AI quota package: %w", err)
			}
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
	subscription, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get Stripe subscription: %w", err)
	}

	isLocal, err := checkIsLocalEvent(subscription)
	if err != nil {
		return fmt.Errorf("failed to check event region: %w", err)
	}
	if !isLocal {
		return nil
	}
	logrus.Infof("Processing invoice payment for subscription: %s", subscription.ID)

	// Get metadata (same)
	workspace := subscription.Metadata["workspace"]
	regionDomain := subscription.Metadata["region_domain"]
	userUIDStr := subscription.Metadata["user_uid"]
	newPlanName := subscription.Metadata["plan_name"]
	paymentID := subscription.Metadata["payment_id"]
	operator := subscription.Metadata["subscription_operator"]
	transactionID := subscription.Metadata["transaction_id"]
	custormer, err := services.StripeServiceInstance.GetCustomerByUID(userUIDStr)
	if custormer, err = services.StripeServiceInstance.GetCustomerByUID(userUIDStr); err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("failed to get customer by user UID %s: %w", userUIDStr, err)
		}
	}
	if custormer == nil || custormer.Metadata == nil || custormer.Metadata["user_uid"] == "" {
		if subscription.Customer != nil && subscription.Customer.ID != "" {
			if err = services.StripeServiceInstance.SetCustomerMetadata(subscription.Customer.ID, map[string]string{
				"user_uid": userUIDStr,
			}); err != nil {
				return fmt.Errorf("failed to set customer metadata for user UID %s: %w", userUIDStr, err)
			}
		} else {
			return fmt.Errorf("customer ID mismatch or customer not found for user UID %s", userUIDStr)
		}
	}

	if workspace == "" || regionDomain == "" || userUIDStr == "" || newPlanName == "" {
		return fmt.Errorf("missing required metadata in session, now metadata: %v", subscription.Metadata)
	}

	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		return fmt.Errorf("invalid user UID in metadata: %w", err)
	}

	nr, err := dao.DBClient.GetNotificationRecipient(userUID)
	if err != nil {
		// logrus.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
		dao.Logger.Errorf("failed to get notification recipient for user %s: %v", userUID, err)
	}
	dao.UserContactProvider.SetUserContact(userUID, nr)
	defer dao.UserContactProvider.RemoveUserContact(userUID)

	// Get workspace subscription
	workspaceSubscription, err := dao.DBClient.GetWorkspaceSubscription(workspace, regionDomain)
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("failed to get workspace subscription: %w", err)
	}
	if workspaceSubscription != nil && workspaceSubscription.Status == types.SubscriptionStatusDeleted {
		_, err := services.StripeServiceInstance.CancelSubscription(subscriptionID)
		if err != nil {
			return fmt.Errorf("failed to cancel subscription for deleted workspace: %w", err)
		}
		dao.Logger.Infof("subscription paid for deleted workspace %s/%s, subscription %s canceled", workspace, regionDomain, subscriptionID)
		return nil
	}
	// subscription_update Upgrading the subscription payment can be completed without the need for webhook processing
	isUpdateSubscription := invoice.BillingReason == "subscription_update"
	if isUpdateSubscription {
		// Handle upgrade subscription success
		// 1. Find the corresponding transaction using payment_id from metadata
		var wsTransaction types.WorkspaceSubscriptionTransaction
		switch types.SubscriptionOperator(operator) {
		case types.SubscriptionTransactionTypeUpgraded:
			paymentID = subscription.Metadata["last_payment_id"]
			if paymentID == "" {
				return fmt.Errorf("missing last_payment_id for upgrade subscription")
			}
			if err := dao.DBClient.GetGlobalDB().Model(&types.WorkspaceSubscriptionTransaction{}).Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("workspace subscription transaction not found for upgrade: %w", err)
				}
				return fmt.Errorf("failed to get upgrade transaction: %w", err)
			}
		case types.SubscriptionTransactionTypeDowngraded:
			if transactionID == "" {
				return fmt.Errorf("missing transaction_id for downgrade subscription")
			}
			if err := dao.DBClient.GetGlobalDB().Where("id = ?", transactionID).First(&wsTransaction).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("workspace subscription transaction not found for downgrade: %w", err)
				}
				return fmt.Errorf("failed to get downgrade transaction: %w", err)
			}
		default:
			return fmt.Errorf("unsupported operator for subscription update: %s", operator)
		}
		if workspaceSubscription == nil {
			return fmt.Errorf("workspace subscription not found for upgrade: %s/%s", workspace, regionDomain)
		}

		// 2. Prepare payment for upgrade
		payment := types.Payment{
			ID: paymentID,
			PaymentRaw: types.PaymentRaw{
				Stripe: &types.StripePay{
					SubscriptionID: subscription.ID,
					CustomerID:     subscription.Customer.ID,
				},
				UserUID:                 userUID,
				RegionUID:               dao.DBClient.GetLocalRegion().UID,
				CreatedAt:               time.Now().UTC(),
				Method:                  helper.STRIPE,
				Amount:                  invoice.AmountPaid * 10_000,
				TradeNO:                 invoice.ID,
				Type:                    types.PaymentTypeSubscription,
				ChargeSource:            types.ChargeSourceStripe,
				Status:                  types.PaymentStatusPAID,
				WorkspaceSubscriptionID: &workspaceSubscription.ID,
				Message:                 fmt.Sprintf("Upgrade payment for workspace %s/%s (%s)", workspace, regionDomain, invoice.BillingReason),
			},
		}

		// 3. Finalize upgrade success using helper (not initial)
		if err := dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
			return finalizeWorkspaceSubscriptionSuccess(tx, workspaceSubscription, &wsTransaction, &payment)
		}); err != nil {
			return fmt.Errorf("failed to finalize upgrade payment: %w", err)
		}

		// 4. Send notification for upgrade success
		if nr != nil {
			plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(wsTransaction.NewPlanName)
			if err != nil {
				return fmt.Errorf("failed to get workspace subscription plan: %w", err)
			}
			features, err := types.ParseMaxResource(plan.MaxResources, plan.Traffic)
			if err != nil {
				return fmt.Errorf("failed to parse plan features: %w", err)
			}

			eventData := &usernotify.WorkspaceSubscriptionEventData{
				WorkspaceName: workspace,
				Operator:      wsTransaction.Operator,
				Domain:        regionDomain,
				RegionDomain:  regionDomain,
				ExpirationDate: fmt.Sprintf("%s - %s",
					workspaceSubscription.CurrentPeriodStartAt.Format("2006.1.2"),
					workspaceSubscription.CurrentPeriodEndAt.Format("2006.1.2")),
				PayStatus:   types.SubscriptionPayStatusPaid,
				OldPlanName: wsTransaction.OldPlanName,
				NewPlanName: wsTransaction.NewPlanName,
				Features:    features,
				Amount:      math.Ceil(float64(invoice.AmountPaid)/float64(100)) * 1_000_000,
			}
			eventData.NextPayDate = workspaceSubscription.CurrentPeriodEndAt.Format("2006-01-02")
			if _, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, eventData, types.SubscriptionTransactionTypeUpgraded, []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
				// logrus.Errorf("failed to handle workspace subscription upgrade event: %v", err)
				dao.Logger.Errorf("failed to send upgrade notification for user %s: %v", userUID, err)
			}
		}
		logrus.Infof("Successfully processed upgrade payment for %s/%s", workspace, regionDomain)
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
				Amount:       invoice.AmountPaid * 10_000,
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
					SubscriptionID: subscription.ID,
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
		if workspaceSubscription != nil {
			workspaceSubscription.CurrentPeriodStartAt = time.Now().UTC()
			workspaceSubscription.CurrentPeriodEndAt = time.Now().UTC().AddDate(0, 1, 0)
		}
		// Finalize
		if err := finalizeWorkspaceSubscriptionSuccess(tx, workspaceSubscription, &wsTransaction, &payment); err != nil {
			return err
		}

		// TODO: Send notification
		if nr != nil {
			plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(wsTransaction.NewPlanName)
			if err != nil {
				return fmt.Errorf("failed to get workspace subscription plan: %w", err)
			}
			features, err := types.ParseMaxResource(plan.MaxResources, plan.Traffic)
			if err != nil {
				return fmt.Errorf("failed to parse plan features: %w", err)
			}
			eventData := &usernotify.WorkspaceSubscriptionEventData{
				WorkspaceName: workspace,
				Operator:      types.SubscriptionOperator(operator),
				Domain:        regionDomain,
				RegionDomain:  regionDomain,
				// ExpirationDate: fmt.Sprintf("%s-%s", workspaceSubscription.CurrentPeriodStartAt.Format("2006-01-02"), workspaceSubscription.CurrentPeriodEndAt.Format("2006-01-02")),
				PayStatus:   types.SubscriptionPayStatusPaid,
				OldPlanName: wsTransaction.OldPlanName,
				NewPlanName: wsTransaction.NewPlanName,
				Features:    features,
				Amount:      math.Ceil(float64(invoice.AmountPaid)/float64(100)) * 1_000_000,
			}
			if workspaceSubscription != nil {
				eventData.ExpirationDate = fmt.Sprintf("%s - %s",
					workspaceSubscription.CurrentPeriodStartAt.Format("2006.1.2"),
					workspaceSubscription.CurrentPeriodEndAt.Format("2006.1.2"))
				eventData.NextPayDate = workspaceSubscription.CurrentPeriodEndAt.Format("2006-01-02")
			} else {
				eventData.ExpirationDate = fmt.Sprintf("%s - %s",
					time.Now().UTC().Format("2006.1.2"),
					time.Now().UTC().AddDate(0, 1, 0).Format("2006.1.2"))
				eventData.NextPayDate = time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")
			}
			// TODO 需要考虑消息发送失败的情况，本身已经重试过了，失败的话先入数据库作为记录
			switch types.SubscriptionOperator(operator) {
			case types.SubscriptionTransactionTypeCreated, types.SubscriptionTransactionTypeUpgraded, types.SubscriptionTransactionTypeRenewed:
				if _, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, eventData, types.SubscriptionOperator(operator), []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
					// logrus.Errorf("failed to handle workspace subscription event: %v", err)
					dao.Logger.Errorf("failed to send subscription success notification for user %s: %v", userUID, err)
					// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
				}
			default:
				logrus.Errorf("unsupported subscription operator: %s", types.SubscriptionOperator(operator))
			}
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
	subscription, err := services.StripeServiceInstance.GetSubscription(subscriptionID)
	if err != nil {
		return fmt.Errorf("failed to get Stripe subscription: %w", err)
	}

	isLocal, err := checkIsLocalEvent(subscription)
	if err != nil {
		return fmt.Errorf("failed to check event region: %w", err)
	}
	if !isLocal {
		return nil
	}
	logrus.Infof("Processing invoice payment failure for subscription: %s", subscription.ID)

	// Get metadata
	workspace := subscription.Metadata["workspace"]
	regionDomain := subscription.Metadata["region_domain"]
	userUIDStr := subscription.Metadata["user_uid"]
	newPlanName := subscription.Metadata["plan_name"]
	paymentID := subscription.Metadata["payment_id"]
	transactionID := subscription.Metadata["transaction_id"]
	operator := subscription.Metadata["subscription_operator"]

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
	if workspaceSubscription != nil && workspaceSubscription.Status == types.SubscriptionStatusDeleted {
		_, err := services.StripeServiceInstance.CancelSubscription(subscriptionID)
		if err != nil {
			return fmt.Errorf("failed to cancel subscription for deleted workspace: %w", err)
		}
		dao.Logger.Infof("renewalFailure: subscription paid for deleted workspace %s/%s, subscription %s canceled", workspace, regionDomain, subscriptionID)
		return nil
	}
	userUID := workspaceSubscription.UserUID

	isInitialSubscription := invoice.BillingReason == "subscription_create"
	isRenewSubscription := invoice.BillingReason == "subscription_cycle"
	isUpdateSubscription := invoice.BillingReason == "subscription_update"
	failureReason := fmt.Sprintf("Stripe payment failed for invoice %s: %s", invoice.ID, invoice.LastFinalizationError.Error())

	notifyEventData := &usernotify.WorkspaceSubscriptionEventData{
		WorkspaceName: workspace,
		Domain:        regionDomain,
		//Operator:       types.SubscriptionOperator(operator),
		PayStatus: types.SubscriptionPayStatusFailed,
		//ExpirationDate: fmt.Sprintf("%s-%s", workspaceSubscription.CurrentPeriodStartAt.Format("2006-01-02"), workspaceSubscription.CurrentPeriodEndAt.Format("2006-01-02")),
		ExpirationDate: fmt.Sprintf("%s - %s",
			workspaceSubscription.CurrentPeriodStartAt.Format("2006.1.2"),
			workspaceSubscription.CurrentPeriodEndAt.Format("2006.1.2")),
		Amount:      math.Ceil(float64(invoice.AmountDue) / float64(100)),
		ErrorReason: invoice.LastFinalizationError.Error(),
	}
	switch {
	case isInitialSubscription:
		notifyEventData.Operator = types.SubscriptionTransactionTypeCreated
	case isRenewSubscription:
		notifyEventData.Operator = types.SubscriptionTransactionTypeRenewed
	case isUpdateSubscription:
		paymentID = subscription.Metadata["last_payment_id"]
		//operator = subscription.Metadata["last_operator"]
		newPlanName = subscription.Metadata["new_plan_name"]
		notifyEventData.Operator = types.SubscriptionOperator(operator)
	default:
		logrus.Errorf("handleWorkspaceSubscriptionRenewalFailure unsupported billing reason for payment failure: %s", invoice.BillingReason)
		return fmt.Errorf("unsupported billing reason: %s", invoice.BillingReason)
	}
	nr, err := dao.DBClient.GetNotificationRecipient(userUID)
	if err != nil {
		return fmt.Errorf("failed to get notification recipient for user %s: %w", userUID, err)
	}
	dao.UserContactProvider.SetUserContact(userUID, nr)
	defer dao.UserContactProvider.RemoveUserContact(userUID)

	// Database operations
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		if isInitialSubscription || isUpdateSubscription {
			// Update transaction to failed
			var wsTransaction types.WorkspaceSubscriptionTransaction
			switch types.SubscriptionOperator(operator) {
			case types.SubscriptionTransactionTypeCreated:
				if paymentID == "" {
					return fmt.Errorf("missing payment_id for %s failure", invoice.BillingReason)
				}
				if err := tx.Where("pay_id = ?", paymentID).First(&wsTransaction).Error; err != nil {
					return fmt.Errorf("transaction not found: %w", err)
				}
			case types.SubscriptionTransactionTypeUpgraded, types.SubscriptionTransactionTypeDowngraded:
				if transactionID == "" {
					return fmt.Errorf("missing transaction_id for %s failure", invoice.BillingReason)
				}
				if err := tx.Where("id = ?", transactionID).First(&wsTransaction).Error; err != nil {
					return fmt.Errorf("transaction not found: %w", err)
				}
			default:
				return fmt.Errorf("unsupported operator for %s failure: %s", invoice.BillingReason, operator)
			}
			wsTransaction.PayStatus = types.SubscriptionPayStatusFailed
			wsTransaction.Status = types.SubscriptionTransactionStatusFailed
			wsTransaction.StatusDesc = failureReason
			if err := tx.Save(&wsTransaction).Error; err != nil {
				return fmt.Errorf("failed to update transaction: %w", err)
			}

			// Update payment order to failed if exists (for initial/upgrade)
			var paymentOrder types.PaymentOrder
			if err := tx.Where("id = ?", paymentID).First(&paymentOrder).Error; err == nil {
				paymentOrder.Status = types.PaymentOrderStatusFailed
				if err := tx.Save(&paymentOrder).Error; err != nil {
					return fmt.Errorf("failed to update payment order: %w", err)
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("failed to query payment order: %w", err)
			}
			// For upgrade failure, also revert plan changes if applied prematurely
			if isUpdateSubscription && workspaceSubscription.PlanName == newPlanName {
				logrus.Infof("Reverting plan change due to upgrade payment failure for %s/%s, old plan: %s", workspace, regionDomain, wsTransaction.OldPlanName)
				oldPlanName := wsTransaction.OldPlanName
				workspaceSubscription.PlanName = oldPlanName
				workspaceSubscription.PayStatus = types.SubscriptionPayStatusFailed
				if err := tx.Save(&workspaceSubscription).Error; err != nil {
					return fmt.Errorf("failed to revert upgrade plan: %w", err)
				}
				// Revert quota and traffic if needed (call revert functions)
				if err := revertWorkspaceSubscriptionQuota(oldPlanName, workspace); err != nil {
					logrus.Errorf("failed to revert quota for upgrade failure: %v", err)
				}
				// TODO: Revert traffic package if added
			}

			notifyEventData.OldPlanName = wsTransaction.OldPlanName
			notifyEventData.NewPlanName = wsTransaction.NewPlanName
			logrus.Warnf("%s payment failed for %s/%s", invoice.BillingReason, workspace, regionDomain)
		} else if isRenewSubscription {
			// TODO 续费失败的情况 先判断当前状态是否已经续费，如果已经续费成功则不处理
			if workspaceSubscription.PayStatus == types.SubscriptionPayStatusPaid && workspaceSubscription.CurrentPeriodEndAt.After(time.Now().UTC()) {
				logrus.Infof("Subscription already active for %s/%s, skipping renewal failure handling", workspace, regionDomain)
				return nil
			}

			// Renewal failure - try balance
			var account types.Account
			if err := tx.Model(&types.Account{}).Where(`"userUid" = ?`, userUID).First(&account).Error; err != nil {
				return fmt.Errorf("failed to get account: %w", err)
			}

			if account.Balance-account.DeductionBalance >= invoice.AmountDue*10_000 { // Assuming AmountDue is in cents, convert to dollars
				// Balance payment success
				_payID, err := gonanoid.New(12)
				if err != nil {
					return fmt.Errorf("failed to create payment id: %w", err)
				}

				// Prepare payment
				payment := types.Payment{
					ID: _payID,
					PaymentRaw: types.PaymentRaw{
						UserUID:                 userUID,
						RegionUID:               dao.DBClient.GetLocalRegion().UID,
						CreatedAt:               time.Now().UTC(),
						Method:                  helper.BALANCE,
						Amount:                  invoice.AmountDue * 10_000,
						TradeNO:                 _payID,
						Type:                    types.PaymentTypeSubscription,
						ChargeSource:            types.ChargeSourceBalance,
						Status:                  types.PaymentStatusPAID,
						WorkspaceSubscriptionID: &workspaceSubscription.ID,
						Message:                 fmt.Sprintf("Balance fallback for failed Stripe renewal on workspace %s/%s", workspace, regionDomain),
					},
				}

				// Deduct balance
				if err := cockroach.AddDeductionAccount(tx, userUID, invoice.AmountDue*10_000); err != nil {
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
					PayID:         _payID,
					Period:        types.SubscriptionPeriodMonthly,
					Amount:        invoice.AmountDue * 10_000,
				}

				// Finalize using helper (not initial)
				if err := finalizeWorkspaceSubscriptionSuccess(tx, workspaceSubscription, &wsTransaction, &payment); err != nil {
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
			// logrus.Errorf("failed to send subscription failure notification to user %s: %v", userUID, err)
			dao.Logger.Errorf("failed to send subscription failure notification for user %s: %v", userUID, err)
			// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
		}
		return nil
	})
}

// Helper function to revert quota for failed upgrades (implement based on your needs)
func revertWorkspaceSubscriptionQuota(planName, workspace string) error {
	// Revert to old plan quota
	res := dao.WorkspacePlanResQuota[planName].DeepCopy()
	// TODO: Implement quota reversion logic similar to updateWorkspaceSubscriptionQuota but with old plan
	nsQuota := resources.GetDefaultResourceQuota(workspace, "quota-"+workspace)
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
		return fmt.Errorf("failed to revert resource quota: %w", err)
	}
	// TODO: Revert debt namespace status if needed
	return nil
}

// handleWorkspaceSubscriptionDeleted
func handleWorkspaceSubscriptionDeleted(event *stripe.Event) error {
	// Parse subscription data from webhook event
	subscriptionData, err := services.StripeServiceInstance.ParseWebhookEventData(event)
	if err != nil {
		return fmt.Errorf("failed to parse webhook data: %v", err)
	}

	subscription, ok := subscriptionData.(*stripe.Subscription)
	if !ok {
		return fmt.Errorf("invalid subscription data type")
	}

	isLocal, err := checkIsLocalEvent(subscription)
	if err != nil {
		return fmt.Errorf("failed to check event region: %w", err)
	}
	if !isLocal {
		return nil
	}
	logrus.Infof("Processing subscription deletion: %s", subscription.ID)

	// Get metadata
	workspace := subscription.Metadata["workspace"]
	regionDomain := subscription.Metadata["region_domain"]
	userUIDStr := subscription.Metadata["user_uid"]

	if workspace == "" || regionDomain == "" || userUIDStr == "" {
		return fmt.Errorf("missing required metadata in subscription")
	}

	userUID, err := uuid.Parse(userUIDStr)
	if err != nil {
		return fmt.Errorf("invalid user UID in metadata: %w", err)
	}

	// Database operations
	return dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// Get workspace subscription
		var workspaceSubscription types.WorkspaceSubscription
		if err := tx.Where("workspace = ? AND region_domain = ?", workspace, regionDomain).First(&workspaceSubscription).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				logrus.Warnf("Workspace subscription not found for deletion: %s/%s", workspace, regionDomain)
				return nil
			}
			return fmt.Errorf("failed to get workspace subscription: %w", err)
		}
		if workspaceSubscription.Status == types.SubscriptionStatusDeleted {
			_, err := services.StripeServiceInstance.CancelSubscription(subscription.ID)
			if err != nil {
				return fmt.Errorf("failed to cancel subscription for deleted workspace: %w", err)
			}
			dao.Logger.Infof("handleSubscriptionDeletedEvent: subscription paid for deleted workspace %s/%s, subscription %s canceled", workspace, regionDomain, subscription.ID)
			return nil
		}
		if workspaceSubscription.Status != types.SubscriptionStatusNormal {
			return nil
		}
		if workspaceSubscription.CurrentPeriodEndAt.After(time.Now().UTC()) {
			// set pay method to balance
			workspaceSubscription.PayMethod = helper.BALANCE
			return tx.Save(&workspaceSubscription).Error
		}
		notifyEventData := &usernotify.WorkspaceSubscriptionEventData{
			WorkspaceName: workspace,
			Domain:        regionDomain,
			Operator:      types.SubscriptionTransactionTypeRenewed,
			OldPlanName:   workspaceSubscription.PlanName,
			NewPlanName:   workspaceSubscription.PlanName,
		}
		plan, err := dao.DBClient.GetWorkspaceSubscriptionPlan(workspaceSubscription.PlanName)
		if err != nil {
			return fmt.Errorf("failed to get workspace subscription plan: %w", err)
		}
		features, err := types.ParseMaxResource(plan.MaxResources, plan.Traffic)
		if err != nil {
			return fmt.Errorf("failed to parse plan features: %w", err)
		}
		notifyEventData.Features = features

		// Renewal failure - try balance
		var account types.Account
		if err := tx.Where("user_uid = ?", userUID).First(&account).Error; err != nil {
			return fmt.Errorf("failed to get account: %w", err)
		}
		price, err := dao.DBClient.GetWorkspaceSubscriptionPlanPrice(workspaceSubscription.PlanName, types.SubscriptionPeriodMonthly)
		if err != nil {
			return fmt.Errorf("failed to get plan price: %w", err)
		}
		notifyEventData.Amount = float64(price.Price)

		if account.Balance-account.DeductionBalance >= price.Price {
			// Balance payment success
			_payID, err := gonanoid.New(12)
			if err != nil {
				return fmt.Errorf("failed to create payment id: %w", err)
			}

			// Prepare payment
			payment := types.Payment{
				ID: _payID,
				PaymentRaw: types.PaymentRaw{
					UserUID:                 userUID,
					RegionUID:               dao.DBClient.GetLocalRegion().UID,
					CreatedAt:               time.Now().UTC(),
					Method:                  helper.BALANCE,
					Amount:                  price.Price,
					TradeNO:                 _payID,
					Type:                    types.PaymentTypeSubscription,
					ChargeSource:            types.ChargeSourceBalance,
					Status:                  types.PaymentStatusPAID,
					WorkspaceSubscriptionID: &workspaceSubscription.ID,
					Message:                 fmt.Sprintf("Balance fallback for failed Stripe renewal on workspace %s/%s", workspace, regionDomain),
				},
			}

			// Deduct balance
			if err := cockroach.AddDeductionAccount(tx, userUID, price.Price); err != nil {
				return fmt.Errorf("failed to deduct balance: %w", err)
			}

			// Prepare transaction
			wsTransaction := types.WorkspaceSubscriptionTransaction{
				ID:            uuid.New(),
				From:          types.TransactionFromSystem,
				Workspace:     workspace,
				RegionDomain:  regionDomain,
				UserUID:       userUID,
				OldPlanName:   workspaceSubscription.PlanName,
				NewPlanName:   workspaceSubscription.PlanName,
				OldPlanStatus: workspaceSubscription.Status,
				Operator:      types.SubscriptionTransactionTypeRenewed,
				StartAt:       time.Now().UTC(),
				CreatedAt:     time.Now().UTC(),
				UpdatedAt:     time.Now().UTC(),
				PayStatus:     types.SubscriptionPayStatusPaid,
				PayID:         _payID,
				Period:        types.SubscriptionPeriodMonthly,
				Amount:        price.Price,
			}

			// Finalize using helper (not initial)
			if err := finalizeWorkspaceSubscriptionSuccess(tx, &workspaceSubscription, &wsTransaction, &payment); err != nil {
				return err
			}
			notifyEventData.PayStatus = types.SubscriptionPayStatusFailedAndUseBalance
			workspaceSubscription.PayMethod = types.PaymentMethodErrAndUseBalance
			logrus.Infof("Renewal succeeded with balance for %s/%s", workspace, regionDomain)
		} else {
			// Both payments failed
			workspaceSubscription.PayStatus = types.SubscriptionPayStatusCanceled
			workspaceSubscription.Status = types.SubscriptionStatusDebt
			// Mark workspace as debt (e.g., add label )
			if err := updateDebtNamespaceStatus(context.Background(), dao.K8sManager.GetClient(), SuspendDebtNamespaceAnnoStatus, []string{workspace}); err != nil {
				return fmt.Errorf("update namespace status error: %w", err)
			}
			notifyEventData.PayStatus = types.SubscriptionPayStatusFailed
			logrus.Warnf("Renewal failed for %s/%s, set to debt status", workspace, regionDomain)
		}

		if _, err = dao.UserNotificationService.HandleWorkspaceSubscriptionEvent(context.Background(), userUID, notifyEventData, types.SubscriptionTransactionTypeRenewed, []usernotify.NotificationMethod{usernotify.NotificationMethodEmail}); err != nil {
			logrus.Errorf("failed to send subscription failure notification to user %s: %v", userUID, err)
			// return fmt.Errorf("failed to send subscription success notification to user %s: %w", userUID, err)
		}

		if err := tx.Save(workspaceSubscription).Error; err != nil {
			return fmt.Errorf("failed to update subscription to debt status: %w", err)
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

	isLocal, err := checkIsLocalEvent(session)
	if err != nil {
		return fmt.Errorf("failed to check event locality: %v", err)
	}
	if !isLocal {
		return nil
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
				return nil
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

// ProcessExpiredWorkspaceSubscriptions processes all expired workspace subscriptions
// @Summary Process expired workspace subscriptions
// @Description Process all expired workspace subscriptions in the current region
// @Tags WorkspaceSubscription
// @Accept json
// @Produce json
// @Param req body helper.AuthBase true "AuthBase"
// @Success 200 {object} gin.H
// @Router /payment/v1alpha1/workspace-subscription/process-expired [post]
func AdminProcessExpiredWorkspaceSubscriptions(c *gin.Context) {
	if err := authenticateAdminRequest(c); err != nil {
		SetErrorResp(c, http.StatusForbidden, gin.H{"error": fmt.Sprintf("admin authenticate error: %v", err)})
		return
	}

	logrus.Info("Starting expired workspace subscription processing...")

	//err := dao.DBClient.ProcessExpiredWorkspaceSubscriptions()
	//if err != nil {
	//	logrus.Errorf("Failed to process expired workspace subscriptions: %v", err)
	//	SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to process expired subscriptions: %v", err)})
	//	return
	//}

	logrus.Info("Completed expired workspace subscription processing")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Expired workspace subscriptions processed successfully",
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
