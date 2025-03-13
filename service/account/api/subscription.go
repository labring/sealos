package api

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"time"

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
	req := &helper.AuthBase{}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
		return
	}
	plans, err := dao.DBClient.GetSubscriptionPlanList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan list: %v", err)})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"plans": plans,
	})
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
	if userSubscription.PlanName == req.PlanName && req.PlanType != helper.Renewal {
		c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "plan name is same as current plan"})
		return
	}
	planList, err := dao.DBClient.GetSubscriptionPlanList()
	if err != nil {
		c.JSON(http.StatusInternalServerError, helper.ErrorMessage{Error: fmt.Sprintf("failed to get subscription plan list: %v", err)})
		return
	}
	var userCurrentPlan, userDescribePlan types.SubscriptionPlan
	for _, plan := range planList {
		if plan.Name == req.PlanName {
			userCurrentPlan = plan
		}
		if plan.Name == userSubscription.PlanName {
			userDescribePlan = plan
		}
	}

	subTransaction := types.SubscriptionTransaction{
		SubscriptionID: userSubscription.ID,
		UserUID:        req.UserUID,
		OldPlanID:      userCurrentPlan.ID,
		OldPlanName:    userCurrentPlan.Name,
		OldPlanStatus:  userSubscription.Status,
		EffectiveAt:    time.Now(),
		NewPlanID:      userDescribePlan.ID,
		NewPlanName:    userDescribePlan.Name,
		NewPlanStatus:  userSubscription.Status,
		CreatedAt:      time.Now(),
		Status:         types.SubscriptionTransactionStatusProcessing,
	}
	//TODO 预检测同一个用户同时只能有一个未处理或处理中(status: Pending,Processing)的订阅操作订单

	amount := int64(0)
	switch req.PlanType {
	case helper.Upgrade:
		// TODO implement subscription upgrade
		if !contain(userCurrentPlan.UpgradePlanList, req.PlanName) {
			c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "plan name is not in upgrade plan list"})
			return
		}

		// TODO implement subscription pay
		if userCurrentPlan.Amount <= 0 {
			subTransaction.Operator = types.SubscriptionTransactionTypeCreated
			//TODO 新订阅
			amount = userDescribePlan.Amount
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
			amount = int64(describePlanSurplusValue - currentPlanSurplusValue)

			//TODO 临近到期的情况处理
		}

	case helper.Downgrade:
		// TODO implement subscription downgrade
		// 符合降级规则
		if !contain(userCurrentPlan.DowngradePlanList, req.PlanName) {
			c.JSON(http.StatusBadRequest, helper.ErrorMessage{Error: "plan name is not in downgrade plan list"})
			return
		}
		//执行时间为计划的下个周期开始变为对应的版本，目前降级为Free
		subTransaction.EffectiveAt = userSubscription.NextCycleDate
		subTransaction.Operator = types.SubscriptionTransactionTypeDowngraded
		subTransaction.Status = types.SubscriptionTransactionStatusPending

	case helper.Renewal:
		// TODO 只变更到期时间
		amount = userDescribePlan.Amount
		subTransaction.Operator = types.SubscriptionTransactionTypeRenewed
	}
	if amount > 0 {
		PayForSubscription(c, req, subTransaction)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": "success",
	})
}

func PayForSubscription(c *gin.Context, req *helper.SubscriptionOperatorReq, subTransaction types.SubscriptionTransaction) {
	if req.PayMethod != helper.CARD {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid pay method"})
		return
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
	var paySvcResp *responsePay.AlipayPayResponse
	var err error
	if req.CardID != nil {
		card, err := dao.DBClient.GetCardInfo(*req.CardID, req.UserUID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get card info: ", err)})
			return
		}
		err = dao.DBClient.PaymentWithFunc(&types.Payment{
			PaymentRaw: types.PaymentRaw{
				UserUID:      req.UserUID,
				Amount:       subTransaction.Amount,
				Method:       req.PayMethod,
				RegionUID:    dao.DBClient.GetLocalRegion().UID,
				TradeNO:      paySvcResp.PaymentRequestId,
				CodeURL:      paySvcResp.NormalUrl,
				Type:         types.PaymentTypeSubscription,
				CardUID:      req.CardID,
				ChargeSource: types.ChargeSourceCard,
			},
		}, func(tx *gorm.DB) error {
			// TODO 检查没有订阅变更
			count, err := cockroach.GetActiveSubscriptionTransactionCount(tx, req.UserUID)
			if err != nil {
				return fmt.Errorf("failed to get active subscription transaction count: %w", err)
			}
			if count > 0 {
				return fmt.Errorf("there is active subscription transaction")
			}
			subTransaction.PayStatus = types.SubscriptionPayStatusPaid
			subTransaction.PayTradeNo = paySvcResp.PaymentRequestId
			return cockroach.CreateSubscriptionTransaction(tx, &subTransaction)
		}, func(_ *gorm.DB) error {
			paySvcResp, err = dao.PaymentService.CreateSubscriptionPayWithCard(paymentReq, card)
			if err != nil {
				return fmt.Errorf("failed to create payment with card: %w", err)
			}
			if paySvcResp.Result.ResultCode != SuccessStatus || paySvcResp.Result.ResultStatus != "S" {
				return fmt.Errorf("payment result is not SUCCESS: %#+v", paySvcResp.Result)
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"data": "success",
		})
	} else {
		paySvcResp, err = dao.PaymentService.CreateNewSubscriptionPay(paymentReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
			return
		}
		if paySvcResp.Result.ResultCode != "PAYMENT_IN_PROCESS" || paySvcResp.Result.ResultStatus != "U" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)})
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
			subTransaction.PayStatus = types.SubscriptionPayStatusPending
			err = cockroach.CreateSubscriptionTransaction(tx, &subTransaction)
			if err != nil {
				return fmt.Errorf("failed to create subscription transaction: %w", err)
			}
			return nil
		}, func(tx *gorm.DB) error {
			err := cockroach.CreatePaymentOrder(
				tx, &types.PaymentOrder{
					PaymentRaw: types.PaymentRaw{
						UserUID:      req.UserUID,
						Amount:       subTransaction.Amount,
						Method:       req.PayMethod,
						RegionUID:    dao.DBClient.GetLocalRegion().UID,
						TradeNO:      paySvcResp.PaymentRequestId,
						CodeURL:      paySvcResp.NormalUrl,
						Type:         types.PaymentTypeAccountRecharge,
						ChargeSource: types.ChargeSourceCard,
					},
					Status: types.PaymentOrderStatusPending,
				})
			if err != nil {
				return fmt.Errorf("failed to create payment order: %w", err)
			}
			return nil
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment order: ", err)})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"data": helper.CreatePayResp{
		RedirectURL: paySvcResp.NormalUrl,
	}})
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
		sendError(c, http.StatusInternalServerError, "failed to check response sign", err)
		return
	} else if !ok {
		logrus.Errorf("Check signature fail")
		sendError(c, http.StatusBadRequest, "check signature fail", nil)
		return
	}

	var notification types.PaymentNotification
	if err := json.Unmarshal(requestInfo.Body, &notification); err != nil {
		logrus.Errorf("Failed to unmarshal notification: %v", err)
		sendError(c, http.StatusBadRequest, "failed to unmarshal notification", err)
		return
	}

	logNotification(notification)

	if err := processSubscriptionPayResult(c, notification); err != nil {
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
