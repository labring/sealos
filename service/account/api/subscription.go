package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"text/template"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils"

	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"

	gonanoid "github.com/matoous/go-nanoid/v2"

	"github.com/labring/sealos/controllers/pkg/database/cockroach"
	"gorm.io/gorm"

	"github.com/sirupsen/logrus"

	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/google/uuid"
	services "github.com/labring/sealos/service/pkg/pay"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
)

// GetSubscriptionUserInfo
// @Summary Get user subscription info
// @Description Get user subscription info
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionUserInfoReq true "SubscriptionUserInfoReq"
// @Success 200 {object} SubscriptionUserInfoResp
// @Router /payment/v1alpha1/subscription/user-info [post]
func GetSubscriptionUserInfo(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	subscription, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription info: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"subscription": subscription,
	})
}

// GetSubscriptionPlanList
// @Summary Get subscription plan list
// @Description Get subscription plan list
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionPlanListReq true "SubscriptionPlanListReq"
// @Success 200 {object} SubscriptionPlanListResp
// @Router /payment/v1alpha1/subscription/plan-list [post]
func GetSubscriptionPlanList(c *gin.Context) {
	plans, err := dao.DBClient.GetSubscriptionPlanList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
	})
}

// GetSubscriptionLastTransaction
// @Summary Get user last subscription transaction
// @Description Get user last subscription transaction
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionLastTransactionReq true "SubscriptionLastTransactionReq"
// @Success 200 {object} SubscriptionLastTransactionResp
// @Router /payment/v1alpha1/subscription/last-transaction [post]
func GetLastSubscriptionTransaction(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	transaction, err := dao.DBClient.GetLastSubscriptionTransaction(req.UserUID)
	if err != nil && err != gorm.ErrRecordNotFound {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get last subscription transaction: %v", err)})
		return
	}
	if transaction == nil {
		transaction = &types.SubscriptionTransaction{}
	}
	c.JSON(http.StatusOK, gin.H{
		"transaction": transaction,
	})
}

// GetSubscriptionUpgradeAmount
// @Summary Get subscription upgrade amount
// @Description Get subscription upgrade amount
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionUpgradeAmountReq true "SubscriptionUpgradeAmountReq"
// @Success 200 {object} SubscriptionUpgradeAmountResp
// @Router /payment/v1alpha1/subscription/upgrade-amount [post]
func GetSubscriptionUpgradeAmount(c *gin.Context) {
	req, err := helper.ParseSubscriptionOperatorReq(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	userSubscription, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription info: %v", err)})
		return
	}
	if userSubscription.PlanName == req.PlanName {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "plan name is same as current plan"})
		return
	}
	currentSubPlan, err := dao.DBClient.GetSubscriptionPlan(userSubscription.PlanName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get current plan: %v", err)})
		return
	}
	if currentSubPlan.Amount <= 0 {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "current plan is free plan"})
		return
	}
	describeSubPlan, err := dao.DBClient.GetSubscriptionPlan(req.PlanName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get describe plan: %v", err)})
		return
	}
	if describeSubPlan.Amount <= currentSubPlan.Amount {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "describe plan amount is less than current plan amount"})
		return
	}
	alreadyUsedDays := time.Since(userSubscription.StartAt).Hours() / 24
	remainingDays := float64(30) - alreadyUsedDays
	currentPlanSurplusValue := math.Ceil(float64(currentSubPlan.Amount) * math.Ceil(remainingDays/30))
	describePlanSurplusValue := math.Ceil(float64(describeSubPlan.Amount) * math.Ceil(remainingDays/30))
	c.JSON(http.StatusOK, gin.H{
		"amount": int64(describePlanSurplusValue - currentPlanSurplusValue),
	})
}

// FlushSubscriptionQuota
// @Summary flush user quota with subscription
// @Description flush user quota with subscription
// @Tags Subscription
// @Accept json
// @Produce json
// @Success 200 {object} SubscriptionFlushQuotaResp
// @Router /payment/v1alpha1/subscription/flush-quota [post]
func FlushSubscriptionQuota(c *gin.Context) {
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	if req.Owner == "" {
		c.JSON(http.StatusOK, gin.H{"success": true})
		return
	}
	config, err := rest.InClusterConfig()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get in cluster config failed: %v", err)})
		return
	}
	clientset, err := kubernetes.NewForConfig(config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("new client set failed: %v", err)})
		return
	}
	nsList, err := getOwnNsList(clientset, req.Owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get own namespace list failed: %v", err)})
		return
	}
	userSub, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("get user subscription failed: %v", err)})
		return
	}
	for _, ns := range nsList {
		quota := getDefaultResourceQuota(ns, "quota-"+ns, dao.SubPlanResourceQuota[userSub.PlanName])
		err = Retry(10, time.Second, func() error {
			_, err := clientset.CoreV1().ResourceQuotas(ns).Update(context.Background(), quota, metav1.UpdateOptions{})
			if err != nil {
				return fmt.Errorf("failed to update resource quota for %s: %w", ns, err)
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("update resource quota failed: %v", err)})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func Retry(attempts int, sleep time.Duration, f func() error) error {
	var err error
	for i := 0; i < attempts; i++ {
		err = f()
		if err == nil {
			return nil
		}
		time.Sleep(sleep)
	}
	return err
}

// getOwnNsWith *kubernetes.Clientset
func getOwnNsList(clientset *kubernetes.Clientset, user string) ([]string, error) {
	if user == "" {
		return nil, fmt.Errorf("user is empty")
	}
	nsList, err := clientset.CoreV1().Namespaces().List(context.Background(), metav1.ListOptions{LabelSelector: fmt.Sprintf("%s=%s", "user.sealos.io/owner", user)})
	if err != nil {
		return nil, fmt.Errorf("list namespace failed: %w", err)
	}
	nsListStr := make([]string, len(nsList.Items))
	for i := range nsList.Items {
		nsListStr[i] = nsList.Items[i].Name
	}
	return nsListStr, nil
}

func getDefaultResourceQuota(ns, name string, hard corev1.ResourceList) *corev1.ResourceQuota {
	return &corev1.ResourceQuota{
		ObjectMeta: metav1.ObjectMeta{
			Name:      name,
			Namespace: ns,
		},
		Spec: corev1.ResourceQuotaSpec{
			Hard: hard,
		},
	}
}

// SubscriptionPay
// @Summary Subscription pay
// @Description Subscription pay
// @Tags Subscription
// @Accept json
// @Produce json
// @Param req body SubscriptionPayReq true "SubscriptionPayReq"
// @Success 200 {object} SubscriptionPayResp
// @Router /payment/v1alpha1/subscription/pay [post]
func CreateSubscriptionPay(c *gin.Context) {
	req, err := helper.ParseSubscriptionOperatorReq(c)
	if err != nil {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("failed to parse request: %v", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		SetErrorResp(c, http.StatusUnauthorized, gin.H{"error": fmt.Sprintf("authenticate error : %v", err)})
		return
	}

	userSubscription, err := dao.DBClient.GetSubscription(&types.UserQueryOpts{UID: req.UserUID})
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get subscription info: %v", err)})
		return
	}
	if userSubscription.PlanName == req.PlanName && req.PlanType != helper.Renewal {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "plan name is same as current plan"})
		return
	}
	planList, err := dao.DBClient.GetSubscriptionPlanList()
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("failed to get subscription plan list: %v", err)})
		return
	}
	var userCurrentPlan, userDescribePlan types.SubscriptionPlan
	for _, plan := range planList {
		if plan.Name == req.PlanName {
			userDescribePlan = plan
		}
		if plan.Name == userSubscription.PlanName {
			userCurrentPlan = plan
		}
	}

	subTransaction := types.SubscriptionTransaction{
		ID:             uuid.New(),
		SubscriptionID: userSubscription.ID,
		UserUID:        req.UserUID,
		OldPlanID:      userCurrentPlan.ID,
		OldPlanName:    userCurrentPlan.Name,
		OldPlanStatus:  userSubscription.Status,
		StartAt:        time.Now(),
		NewPlanID:      userDescribePlan.ID,
		NewPlanName:    userDescribePlan.Name,
		CreatedAt:      time.Now(),
		Status:         types.SubscriptionTransactionStatusProcessing,
	}
	//TODO 预检测同一个用户同时只能有一个未处理或处理中(status: Pending,Processing)的订阅操作订单

	switch req.PlanType {
	case helper.Upgrade:
		// TODO implement subscription upgrade
		if !contain(userCurrentPlan.UpgradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in upgrade plan list: %v", userCurrentPlan.UpgradePlanList)})
			return
		}

		// TODO implement subscription pay
		if userCurrentPlan.Amount <= 0 {
			subTransaction.Operator = types.SubscriptionTransactionTypeCreated
			//TODO 新订阅
			subTransaction.Amount = userDescribePlan.Amount
		} else {
			//TODO 升级订阅
			subTransaction.Operator = types.SubscriptionTransactionTypeUpgraded
			//  TODO free->hobby：直接购买
			//hobby->pro：按照hobby未使用天数补充差价。补充差价为a，hobby已使用天数为d，计算公式：a = 5*(d/30) + 15
			// userSubscription.StartAt 到 now的天数
			alreadyUsedDays := time.Since(userSubscription.StartAt).Hours() / 24
			remainingDays := float64(30) - alreadyUsedDays
			currentPlanSurplusValue := math.Ceil(float64(userCurrentPlan.Amount) * math.Ceil(remainingDays/30))
			describePlanSurplusValue := math.Ceil(float64(userDescribePlan.Amount) * math.Ceil(remainingDays/30))
			// amount
			subTransaction.Amount = int64(describePlanSurplusValue - currentPlanSurplusValue)

			//TODO 临近到期的情况处理
		}

	case helper.Downgrade:
		// TODO implement subscription downgrade
		// 符合降级规则
		if !contain(userCurrentPlan.DowngradePlanList, req.PlanName) {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("plan name is not in downgrade plan list: %v", userCurrentPlan.DowngradePlanList)})
			return
		}
		//执行时间为计划的下个周期开始变为对应的版本，目前降级为Free
		subTransaction.StartAt = userSubscription.NextCycleDate
		subTransaction.Operator = types.SubscriptionTransactionTypeDowngraded
		subTransaction.Status = types.SubscriptionTransactionStatusPending

	case helper.Renewal:
		// TODO 只变更到期时间
		subTransaction.Amount = userDescribePlan.Amount
		subTransaction.Operator = types.SubscriptionTransactionTypeRenewed
	}
	if subTransaction.Amount > 0 {
		PayForSubscription(c, req, subTransaction)
		return
	} else {
		SubscriptionWithOutPay(c, req, subTransaction)
	}
}

func SetSuccessResp(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": "true"})
}

func SetErrorResp(c *gin.Context, code int, h map[string]any) {
	h["success"] = false
	c.JSON(code, h)
}

func PayForSubscription(c *gin.Context, req *helper.SubscriptionOperatorReq, subTransaction types.SubscriptionTransaction) {
	if req.PayMethod != helper.CARD {
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "invalid pay method"})
		return
	}

	lastSubTransaction, err := dao.DBClient.GetLastSubscriptionTransaction(req.UserUID)
	if err != nil && err != gorm.ErrRecordNotFound {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get last subscription transaction: ", err)})
		return
	}
	logrus.Infof("last subscription transaction: %v", lastSubTransaction)
	if lastSubTransaction != nil && (lastSubTransaction.Status == types.SubscriptionTransactionStatusProcessing || lastSubTransaction.Status == types.SubscriptionTransactionStatusPending) {
		// TODO
		// Check if the last transaction is the same as this one
		if lastSubTransaction.PayStatus == types.SubscriptionPayStatusFailed {
			dao.DBClient.GetGlobalDB().Model(&lastSubTransaction).Update("status", types.SubscriptionTransactionStatusFailed)
			logrus.Errorf("last subscription transaction pay failed, user: %s", req.UserUID)
			PayForSubscription(c, req, subTransaction)
			return
		}
		payment := &types.PaymentOrder{}
		if err := dao.DBClient.GetGlobalDB().Model(&types.PaymentOrder{}).Where(
			`"userUid" = ? AND "id" = ?`, req.UserUID, lastSubTransaction.PayID).Find(&payment).Error; err != nil {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get payment: ", err)})
			return
		}
		logrus.Infof("payment: %v", payment)
		if payment.TradeNO == "" {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "payment trade no is empty"})
			return
		}
		logrus.Infof("payment trade no: %s", payment.TradeNO)
		payQueryResp, err := dao.PaymentService.QueryPayment(payment.TradeNO, "")
		if err != nil {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to query payment: ", err)})
			return
		}
		if payQueryResp.Result.ResultCode != "SUCCESS" && payQueryResp.Result.ResultStatus != "S" {
			data, err := json.MarshalIndent(payQueryResp, "", "  ")
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to marshal pay query response: ", err)})
				return
			}
			logrus.Errorf("payment is failed, payQueryResp: %s", data)
			err = dao.DBClient.GetGlobalDB().Model(&payment).Update("status", types.PaymentOrderStatusFailed).Error
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to update payment status: ", err)})
				return
			}
			err = dao.DBClient.GetGlobalDB().Model(&lastSubTransaction).Update("status", types.SubscriptionTransactionStatusFailed).Error
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to update subscription transaction status: ", err)})
				return
			}
			PayForSubscription(c, req, subTransaction)
			return
		}

		/*
			SUCCESS：支付成功。
			FAIL：支付失败。
			PROCESSING：支付处理中。
			CANCELLED：支付已取消。
			PENDING：支付完成，等待最终支付结果。
		*/
		switch payQueryResp.PaymentStatus {
		case "SUCCESS":
			if req.CardID != nil {
				cardInfo, err := dao.DBClient.GetCardInfo(req.UserUID, req.UserUID)
				if err != nil {
					SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get card info: ", err)})
					return
				}
				if err = newCardSubscriptionPaymentHandler(payment.TradeNO, *cardInfo); err != nil {
					SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to handle new card subscription payment: ", err)})
					return
				}
				SetSuccessResp(c)
				return
			}
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "payment success"})
			return
		case "PROCESSING":
			if payment.CodeURL == "" {
				SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "payment code url is empty"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"redirectUrl": payment.CodeURL, "success": true})
			return
		case "FAIL":
			// TODO
			err := dao.DBClient.GetGlobalDB().Model(&payment).Update("status", types.PaymentOrderStatusFailed).Error
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to update payment status: ", err)})
				return
			}
			err = dao.DBClient.GetGlobalDB().Model(&lastSubTransaction).Update("status", types.SubscriptionTransactionStatusFailed).Error
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to update subscription transaction status: ", err)})
				return
			}
			PayForSubscription(c, req, subTransaction)
			return
		case "CANCELLED":
			// TODO 处理上次状态
			err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
				if err := tx.Model(&payment).Update("status", types.PaymentOrderStatusFailed).Error; err != nil {
					return fmt.Errorf("failed to update payment status: %w", err)
				}
				if err := tx.Model(&lastSubTransaction).Update("status", types.SubscriptionTransactionStatusFailed).Error; err != nil {
					return fmt.Errorf("failed to update subscription transaction status: %w", err)
				}
				return nil
			})
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to update payment status: ", err)})
				return
			}
			PayForSubscription(c, req, subTransaction)
			return
		case "PENDING":
			time.Sleep(time.Second * 1)
			logrus.Errorf("payment is pending, user: %s, %s", req.UserUID, payment.TradeNO)
			PayForSubscription(c, req, subTransaction)
			return
		default:
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("payment status is invalid: %v", payQueryResp.PaymentStatus)})
			return
		}
	}

	paymentReq := services.PaymentRequest{
		RequestID:     uuid.NewString(),
		UserUID:       req.UserUID,
		Amount:        subTransaction.Amount,
		Currency:      dao.PaymentCurrency,
		UserAgent:     c.GetHeader("User-Agent"),
		ClientIP:      c.ClientIP(),
		DeviceTokenID: c.GetHeader("Device-Token-ID"),
	}
	paymentID, err := gonanoid.New(12)
	if err != nil {
		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment id: ", err)})
		return
	}
	subTransaction.PayID = paymentID
	var paySvcResp *responsePay.AlipayPayResponse
	if req.CardID != nil {
		emailTmplEnv := utils.EnvSubSuccessEmailTmpl
		err := SubscriptionPayForBindCard(paymentReq, req, &subTransaction)
		if err != nil {
			emailTmplEnv = utils.EnvSubFailedEmailTmpl
			SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to pay for subscription with bind card: ", err)})
		} else {
			SetSuccessResp(c)
		}
		if err = SendUserPayEmail(req.UserUID, emailTmplEnv); err != nil {
			logrus.Errorf("Failed to send subscription success email: %v", err)
		}
		return
	} else {
		paySvcResp, err = dao.PaymentService.CreateNewSubscriptionPay(paymentReq)
		if err != nil {
			SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
			return
		}
		if paySvcResp.Result.ResultCode != "PAYMENT_IN_PROCESS" || paySvcResp.Result.ResultStatus != "U" {
			SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprintf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)})
			return
		}
		err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
			// TODO 检查没有订阅变更
			count, err := cockroach.GetActiveSubscriptionTransactionCount(tx, req.UserUID)
			if err != nil {
				return fmt.Errorf("failed to get active subscription transaction count: %w", err)
			}
			if count > 0 {
				return fmt.Errorf("there is active subscription transaction")
			}
			//lastSub, err := dao.GetLastSubscriptionTransaction(tx, req.UserUID)
			//if err != nil && err != gorm.ErrRecordNotFound {
			//	return fmt.Errorf("failed to get last subscription transaction: %w", err)
			//}
			//if lastSub != nil && (lastSub.Status == types.SubscriptionTransactionStatusProcessing || lastSub.Status == types.SubscriptionTransactionStatusPending) {
			//
			//	// TODO If the previous operation is the same as this one: xxx
			//	if lastSub.PayStatus == types.SubscriptionPayStatusPending {
			//
			//		if lastSub.NewPlanName == subTransaction.NewPlanName {
			//			// Returns the connection to the last payment, and reinitiates the payment if it times out or has already failed
			//
			//		}
			//	}
			//	return fmt.Errorf("there is active subscription transaction")
			//}
			subTransaction.PayStatus = types.SubscriptionPayStatusPending
			err = cockroach.CreateSubscriptionTransaction(tx, &subTransaction)
			if err != nil {
				return fmt.Errorf("failed to create subscription transaction: %w", err)
			}
			return nil
		}, func(tx *gorm.DB) error {
			err := cockroach.CreatePaymentOrder(
				tx, &types.PaymentOrder{
					ID: paymentID,
					PaymentRaw: types.PaymentRaw{
						UserUID:      req.UserUID,
						Amount:       subTransaction.Amount,
						Method:       req.PayMethod,
						RegionUID:    dao.DBClient.GetLocalRegion().UID,
						TradeNO:      paySvcResp.PaymentRequestId,
						CodeURL:      paySvcResp.NormalUrl,
						Type:         types.PaymentTypeSubscription,
						ChargeSource: types.ChargeSourceNewCard,
					},
					Status: types.PaymentOrderStatusPending,
				})
			if err != nil {
				return fmt.Errorf("failed to create payment order: %w", err)
			}
			return nil
		})
		if err != nil {
			SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment order: ", err)})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"redirectUrl": paySvcResp.NormalUrl, "success": true})
}

func SubscriptionWithOutPay(c *gin.Context, req *helper.SubscriptionOperatorReq, subTransaction types.SubscriptionTransaction) {
	err := dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// TODO 检查没有订阅变更
		count, err := cockroach.GetActiveSubscriptionTransactionCount(tx, req.UserUID)
		if err != nil {
			return fmt.Errorf("failed to get active subscription transaction count: %w", err)
		}
		if count > 0 {
			return fmt.Errorf("there is active subscription transaction")
		}
		subTransaction.PayStatus = types.SubscriptionPayStatusNoNeed
		err = cockroach.CreateSubscriptionTransaction(tx, &subTransaction)
		if err != nil {
			return fmt.Errorf("failed to create subscription transaction: %w", err)
		}
		return nil
	})
	if err != nil {
		SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create subscription transaction: ", err)})
		return
	}
	err = SendUserPayEmail(req.UserUID, utils.EnvSubSuccessEmailTmpl)
	if err != nil {
		logrus.Errorf("failed to send user %s SubscriptionWithOutPay email: %v", req.UserID, err)
	}
	SetSuccessResp(c)
}

func SubscriptionPayForBindCard(paymentReq services.PaymentRequest, req *helper.SubscriptionOperatorReq, subTransaction *types.SubscriptionTransaction) error {
	paymentID, err := gonanoid.New(12)
	if err != nil {
		return fmt.Errorf("failed to create payment id: %w", err)
	}
	subTransaction.PayID = paymentID
	var paySvcResp *responsePay.AlipayPayResponse
	card, err := dao.DBClient.GetCardInfo(*req.CardID, req.UserUID)
	if err != nil {
		return fmt.Errorf("failed to get card info: %w", err)
	}

	payment := types.Payment{
		ID: paymentID,
		PaymentRaw: types.PaymentRaw{
			UserUID:      req.UserUID,
			Amount:       subTransaction.Amount,
			Method:       req.PayMethod,
			RegionUID:    dao.DBClient.GetLocalRegion().UID,
			TradeNO:      paymentReq.RequestID,
			Type:         types.PaymentTypeSubscription,
			CardUID:      req.CardID,
			ChargeSource: types.ChargeSourceBindCard,
		},
	}
	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// TODO 检查没有订阅变更
		count, err := cockroach.GetActiveSubscriptionTransactionCount(tx, req.UserUID)
		if err != nil {
			return fmt.Errorf("failed to get active subscription transaction count: %w", err)
		}
		if count > 0 {
			return fmt.Errorf("there is active subscription transaction")
		}
		subTransaction.PayStatus = types.SubscriptionPayStatusPaid
		err = cockroach.CreateSubscriptionTransaction(tx, subTransaction)
		if err != nil {
			return fmt.Errorf("failed to create subscription transaction: %w", err)
		}

		if err := tx.First(&types.Payment{ID: payment.ID}).Error; err == nil {
			return nil
		}
		if err := tx.Create(&payment).Error; err != nil {
			return fmt.Errorf("failed to save payment: %w", err)
		}
		tx.Model(&types.Subscription{}).Where(&types.Subscription{ID: subTransaction.SubscriptionID, UserUID: req.UserUID}).Update("card_id", req.CardID)
		paySvcResp, err = dao.PaymentService.CreateSubscriptionPayWithCard(paymentReq, card)
		if err != nil {
			return fmt.Errorf("failed to create payment with card: %w", err)
		}
		if paySvcResp.Result.ResultCode != SuccessStatus || paySvcResp.Result.ResultStatus != "S" {
			return fmt.Errorf("payment result is not SUCCESS: %#+v", paySvcResp.Result)
		}
		// TODO 发邮箱通知
		//if err := SendUserPayEmail(req.UserUID, utils.EnvSubSuccessEmailTmpl); err != nil {
		//	logrus.Errorf("failed to send user %s email: %v", req.UserID, err)
		//}

		return nil
	})
	if err != nil {
		return fmt.Errorf("failed to create payment: %w", err)
	}
	return nil
}

func SendUserPayEmail(userUID uuid.UUID, payType string) error {
	tx := dao.DBClient.GetGlobalDB()
	var emailProvider types.OauthProvider
	var userInfo types.UserInfo
	err := dao.DBClient.GetGlobalDB().Where(&types.OauthProvider{UserUID: userUID, ProviderType: types.OauthProviderTypeEmail}).First(&emailProvider).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return fmt.Errorf("failed to get email provider: %w", err)
	}

	if emailProvider.ProviderID != "" {
		err = tx.Where(types.UserInfo{UserUID: userUID}).Find(&userInfo).Error
		if err != nil {
			return fmt.Errorf("failed to get user info: %w", err)
		}
		tmp, err := template.New("subscription-success").Parse(dao.EmailTmplMap[payType])
		if err != nil {
			return fmt.Errorf("failed to parse email template: %w", err)
		}
		var rendered bytes.Buffer
		if err = tmp.Execute(&rendered, map[string]string{
			"FirstName": userInfo.FirstName,
			"LastName":  userInfo.LastName,
			"Domain":    dao.DBClient.GetLocalRegion().Domain,
		}); err != nil {
			return fmt.Errorf("failed to render email template: %w", err)
		}
		if err := dao.SMTPConfig.SendEmail(rendered.String(), emailProvider.ProviderID); err != nil {
			return fmt.Errorf("failed to send email: %w", err)
		}
	}
	return nil
}

func SubscriptionPayByBalance(req *helper.SubscriptionOperatorReq, subTransaction *types.SubscriptionTransaction) error {
	paymentID, err := gonanoid.New(12)
	if err != nil {
		return fmt.Errorf("failed to create payment id: %w", err)
	}
	subTransaction.PayID = paymentID

	err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
		// TODO 检查没有订阅变更
		count, dErr := cockroach.GetActiveSubscriptionTransactionCount(tx, req.UserUID)
		if dErr != nil {
			return fmt.Errorf("failed to get active subscription transaction count: %w", dErr)
		}
		if count > 0 {
			return fmt.Errorf("there is active subscription transaction")
		}
		subTransaction.PayStatus = types.SubscriptionPayStatusPaid
		dErr = cockroach.CreateSubscriptionTransaction(tx, subTransaction)
		if dErr != nil {
			return fmt.Errorf("failed to create subscription transaction: %w", dErr)
		}
		if dErr = tx.Create(&types.Payment{
			ID: paymentID,
			PaymentRaw: types.PaymentRaw{
				UserUID:      req.UserUID,
				Amount:       subTransaction.Amount,
				Method:       req.PayMethod,
				RegionUID:    dao.DBClient.GetLocalRegion().UID,
				Type:         types.PaymentTypeSubscription,
				ChargeSource: types.ChargeSourceBalance,
			},
		}).Error; dErr != nil {
			return fmt.Errorf("failed to save payment: %w", dErr)
		}
		// check account balance
		var account types.Account
		if dErr = tx.Where(types.Account{UserUID: subTransaction.UserUID}).First(&account).Error; dErr != nil {
			return fmt.Errorf("failed to get account: %w", dErr)
		}
		if account.Balance-account.DeductionBalance < subTransaction.Amount {
			return fmt.Errorf("insufficient balance")
		}
		dErr = cockroach.AddDeductionAccount(tx, subTransaction.UserUID, subTransaction.Amount)
		if dErr != nil {
			return fmt.Errorf("failed to add deduction account: %w", dErr)
		}
		return nil
	})
	return err
}

func NewSubscriptionPayNotifyHandler(c *gin.Context) {
	requestInfo := requestInfoStruct{
		Path:         c.Request.RequestURI,
		Method:       c.Request.Method,
		ResponseTime: c.GetHeader("request-time"),
		ClientID:     c.GetHeader("client-id"),
		Signature:    c.GetHeader("signature"),
	}

	var err error
	requestInfo.Body, err = c.GetRawData()
	if err != nil {
		logrus.Errorf("Failed to get raw data: %v", err)
		sendError(c, http.StatusBadRequest, "failed to get raw data", err)
		return
	}

	if ok, err := dao.PaymentService.CheckRspSign(
		requestInfo.Path,
		requestInfo.Method,
		requestInfo.ClientID,
		requestInfo.ResponseTime,
		string(requestInfo.Body),
		requestInfo.Signature,
	); err != nil {
		logrus.Errorf("Failed to check response sign: %v", err)
		logrus.Errorf("Path: %s\n Method: %s\n ClientID: %s\n ResponseTime: %s\n Body: %s\n Signature: %s", requestInfo.Path, requestInfo.Method, requestInfo.ClientID, requestInfo.ResponseTime, string(requestInfo.Body), requestInfo.Signature)
		sendError(c, http.StatusUnauthorized, "failed to check response sign", err)
		return
	} else if !ok {
		logrus.Errorf("Check signature fail")
		sendError(c, http.StatusBadRequest, "check signature fail", nil)
		return
	}

	var notification types.CaptureNotification
	if err := json.Unmarshal(requestInfo.Body, &notification); err != nil {
		logrus.Errorf("Failed to unmarshal notification: %v", err)
		sendError(c, http.StatusBadRequest, "failed to unmarshal notification", err)
		return
	}
	notifyType := notification.NotifyType
	notifyResult := notification.Result
	paymentRequestID := notification.CaptureRequestID
	paymentID := notification.PaymentID
	if notification.NotifyType == types.NotifyTypePaymentResult {
		var paymentNotification types.PaymentNotification
		if err := json.Unmarshal(requestInfo.Body, &paymentNotification); err != nil {
			logrus.Errorf("Failed to unmarshal payment notification: %v", err)
			sendError(c, http.StatusBadRequest, "failed to unmarshal payment notification", err)
			return
		}
		notifyResult = paymentNotification.Result
		paymentRequestID = paymentNotification.PaymentRequestID
		paymentID = paymentNotification.PaymentID
		logNotification(paymentNotification)
	} else {
		logNotification(notification)
	}

	if err := processSubscriptionPayResult(c, notifyType, notifyResult, paymentRequestID, paymentID); err != nil {
		logrus.Errorf("Failed to process payment result: %v", err)
		return // 错误已在 processPaymentResult 中处理
	}

	sendSuccessResponse(c)
}

func contain(planList []string, planName string) bool {
	for _, plan := range planList {
		if plan == planName {
			return true
		}
	}
	return false
}
