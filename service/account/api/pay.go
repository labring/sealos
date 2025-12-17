package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/labring/sealos/service/account/dao"
	"github.com/labring/sealos/service/account/helper"
	services "github.com/labring/sealos/service/pkg/pay"
	gonanoid "github.com/matoous/go-nanoid/v2"
	"github.com/sirupsen/logrus"
	"gorm.io/gorm"
)

const (
	SuccessStatus    = "SUCCESS"
	PaymentInProcess = "PAYMENT_IN_PROCESS"
)

// CreateCardPay creates a payment
// @Summary Create a payment
// @Description Create a payment
// @Tags account
// @Accept json
// @Produce json
// @Param req body CreatePayReq true "CreatePayReq"
// @Success 200 {object} CreatePayResp
// @Router /account/v1alpha1/createPay [post]
func CreateCardPay(c *gin.Context) {
	req, err := helper.ParseCreatePayReq(c)
	if err != nil {
		SetErrorResp(
			c,
			http.StatusBadRequest,
			gin.H{"error": fmt.Sprint("failed to parse request: ", err)},
		)
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		SetErrorResp(
			c,
			http.StatusUnauthorized,
			gin.H{"error": fmt.Sprint("authenticate error: ", err)},
		)
		return
	}

	if req.Method == "CARD" {
		paymentReq := services.PaymentRequest{
			RequestID:     uuid.NewString(),
			UserUID:       req.UserUID,
			Amount:        req.Amount,
			Currency:      dao.PaymentCurrency,
			UserAgent:     c.GetHeader("User-Agent"),
			ClientIP:      c.ClientIP(),
			DeviceTokenID: c.GetHeader("Device-Token-ID"),
		}
		var paySvcResp *responsePay.AlipayPayResponse

		var createPayHandler func(tx *gorm.DB) error
		if req.BindCardInfo != nil {
			createPayHandler = func(tx *gorm.DB) error {
				card, err := dao.DBClient.GetCardInfo(req.CardID, req.UserUID)
				if err != nil {
					return fmt.Errorf("failed to get card info: %w", err)
				}
				paySvcResp, err = dao.PaymentService.CreatePaymentWithCard(paymentReq, card)
				if err != nil {
					return fmt.Errorf("failed to create payment with card: %w", err)
				}
				if (paySvcResp.Result.ResultCode == SuccessStatus && paySvcResp.Result.ResultStatus == "S") ||
					(paySvcResp.Result.ResultCode == PaymentInProcess && paySvcResp.Result.ResultStatus == "U") {
					return nil
				}
				return fmt.Errorf("payment result is not SUCCESS: %#+v", paySvcResp.Result)
			}
		} else {
			createPayHandler = func(tx *gorm.DB) error {
				paySvcResp, err = dao.PaymentService.CreateNewPayment(paymentReq)
				if err != nil {
					return fmt.Errorf("failed to create payment: %w", err)
				}
				if paySvcResp.Result.ResultCode != PaymentInProcess || paySvcResp.Result.ResultStatus != "U" {
					return fmt.Errorf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)
				}
				return nil
			}
		}

		// if req.BindCardInfo != nil {
		//	card, err := dao.DBClient.GetCardInfo(req.BindCardInfo.CardID, req.UserUID)
		//	if err != nil {
		//		SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get card info: ", err)})
		//		return
		//	}
		//	if card == nil {
		//		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "card not found"})
		//		return
		//	}
		//	if card.CardToken == "" {
		//		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "card token not set, please rebind card"})
		//		return
		//	}
		//	err = dao.DBClient.PaymentWithFunc(&types.Payment{
		//		PaymentRaw: types.PaymentRaw{
		//			UserUID:      req.UserUID,
		//			Amount:       req.Amount,
		//			Method:       req.Method,
		//			RegionUID:    dao.DBClient.GetLocalRegion().UID,
		//			TradeNO:      paymentReq.RequestID,
		//			Type:         types.PaymentTypeAccountRecharge,
		//			ChargeSource: types.ChargeSourceBindCard,
		//		},
		//	}, nil, func(_ *gorm.DB) error {
		//		paySvcResp, err = dao.PaymentService.CreatePaymentWithCard(paymentReq, card)
		//		if err != nil {
		//			return fmt.Errorf("failed to create payment with card: %w", err)
		//		}
		//		if paySvcResp.Result.ResultCode != SuccessStatus || paySvcResp.Result.ResultStatus != "S" {
		//			return fmt.Errorf("payment result is not SUCCESS: %#+v", paySvcResp.Result)
		//		}
		//		return nil
		//	})
		//	if err != nil {
		//		SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
		//	} else {
		//		SetSuccessResp(c)
		//		// TODO 发邮箱通知
		//		account, err := dao.DBClient.GetAccount(types.UserQueryOpts{UID: req.UserUID})
		//		if err != nil {
		//			logrus.Errorf("failed to get account: %v", err)
		//		}
		//		if account != nil {
		//			if err = sendUserPayEmail(req.UserUID, &utils.EmailPayRender{
		//				Type:           utils.EnvPaySuccessEmailTmpl,
		//				Domain:         dao.DBClient.GetLocalRegion().Domain,
		//				TopUpAmount:    req.Amount / 1_000_000,
		//				AccountBalance: (account.Balance - account.DeductionBalance) / 1_000_000,
		//			}); err != nil {
		//				logrus.Errorf("failed to send user %s email: %v", req.UserID, err)
		//			}
		//		}
		//	}
		//	return
		// } else {
		//	paySvcResp, err = dao.PaymentService.CreateNewPayment(paymentReq)
		//	if err != nil {
		//		SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
		//		return
		//	}
		//	if paySvcResp.Result.ResultCode != "PAYMENT_IN_PROCESS" || paySvcResp.Result.ResultStatus != "U" {
		//		SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprintf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)})
		//		return
		//	}
		//
		//	// do something
		//	err = dao.DBClient.CreatePaymentOrder(&types.PaymentOrder{
		//		PaymentRaw: types.PaymentRaw{
		//			UserUID:   req.UserUID,
		//			Amount:    req.Amount,
		//			Method:    req.Method,
		//			RegionUID: dao.DBClient.GetLocalRegion().UID,
		//			TradeNO:   paymentReq.RequestID,
		//			//CodeURL:      paySvcResp.NormalUrl,
		//			Type:         types.PaymentTypeAccountRecharge,
		//			ChargeSource: types.ChargeSourceNewCard,
		//		},
		//		Status: types.PaymentOrderStatusPending,
		//	})
		//	if err != nil {
		//		SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment order: ", err)})
		//		return
		//	}
		//	c.JSON(http.StatusOK, gin.H{
		//		"redirectUrl": paySvcResp.NormalUrl,
		//		"success":     true,
		//	})
		//}
		paymentID, err := gonanoid.New(12)
		if err != nil {
			SetErrorResp(
				c,
				http.StatusInternalServerError,
				gin.H{"error": fmt.Sprint("failed to create payment id: ", err)},
			)
			return
		}
		err = dao.DBClient.GlobalTransactionHandler(func(tx *gorm.DB) error {
			return tx.Model(&types.PaymentOrder{}).Create(&types.PaymentOrder{
				ID: paymentID,
				PaymentRaw: types.PaymentRaw{
					UserUID:   req.UserUID,
					Amount:    req.Amount,
					Method:    req.Method,
					RegionUID: dao.DBClient.GetLocalRegion().UID,
					TradeNO:   paymentReq.RequestID,
					CreatedAt: time.Now().UTC(),
					// CodeURL:      paySvcResp.NormalUrl,
					Type:         types.PaymentTypeAccountRecharge,
					ChargeSource: types.ChargeSourceNewCard,
				},
				Status: types.PaymentOrderStatusPending,
			}).Error
		}, createPayHandler, func(tx *gorm.DB) error {
			if paySvcResp.NormalUrl != "" {
				// Set payment order normalurl with paymentID
				dErr := tx.Model(&types.PaymentOrder{}).
					Where("id = ?", paymentID).
					Update("code_url", paySvcResp.NormalUrl).
					Error
				if dErr != nil {
					logrus.Warnf("failed to update payment order code url: %v", dErr)
				}
			}
			return nil
		})
		if err != nil {
			SetErrorResp(
				c,
				http.StatusConflict,
				gin.H{"error": fmt.Sprint("failed to create payment: ", err)},
			)
		} else {
			c.JSON(http.StatusOK, gin.H{
				"redirectUrl": paySvcResp.NormalUrl,
				"success":     true,
			})
		}
		return
	}
	SetErrorResp(c, http.StatusBadGateway, gin.H{"error": "unsupported payment method"})
}

type requestInfoStruct struct {
	Path         string
	Method       string
	ResponseTime string
	ClientID     string
	Signature    string
	Body         []byte
}

func NewPayNotifyHandler(c *gin.Context) {
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
		logrus.Errorf(
			"Path: %s\n Method: %s\n ClientID: %s\n ResponseTime: %s\n Body: %s\n Signature: %s",
			requestInfo.Path,
			requestInfo.Method,
			requestInfo.ClientID,
			requestInfo.ResponseTime,
			string(requestInfo.Body),
			requestInfo.Signature,
		)
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
	}

	logNotification(notification)

	if err := processPaymentResult(c, notifyType, notifyResult, paymentRequestID, paymentID); err != nil {
		logrus.Errorf("Failed to process payment result: %v", err)
		return // 错误已在 processPaymentResult 中处理
	}

	sendSuccessResponse(c)
}

func sendError(c *gin.Context, status int, message string, err error) {
	if err != nil {
		message = fmt.Sprintf("%s: %v", message, err)
	}
	c.JSON(status, gin.H{"error": message})
}

// TODO delete
func logNotification(notification any) {
	if prettyJSON, err := json.MarshalIndent(notification, "", "    "); err != nil {
		logrus.Errorf("Failed to marshal notification: %v", err)
	} else {
		logrus.Infof("Notify: %s", string(prettyJSON))
	}
}

// 辅助函数：处理支付结果
func processPaymentResult(
	c *gin.Context,
	notifyType string,
	notifyResult types.Result,
	paymentRequestID, paymentID string,
) error {
	return processPaymentResultWithHandler(
		c,
		notifyType,
		notifyResult,
		paymentRequestID,
		paymentID,
		newCardPaymentHandler,
		newCardPaymentFailureHandler,
	)
}

func newCardPaymentHandler(paymentID string, card types.CardInfo) error {
	userUID, err := dao.DBClient.NewCardPaymentHandler(paymentID, card)
	if err != nil {
		return err
	}
	if userUID != uuid.Nil {
		if err = sendCardPaymentPayEmail(userUID, paymentID, utils.EnvPaySuccessEmailTmpl); err != nil {
			logrus.Errorf("Failed to send PAY_SUCCESS_EMAIL_TMPL email to %s: %v", userUID, err)
		}
	}
	return nil
}

func sendCardPaymentPayEmail(userUID uuid.UUID, paymentID, payType string) error {
	var order types.PaymentOrder
	if err := dao.DBClient.GetGlobalDB().Model(&types.PaymentOrder{}).Where(types.PaymentOrder{PaymentRaw: types.PaymentRaw{TradeNO: paymentID, UserUID: userUID}}).Find(&order).Error; err != nil {
		return fmt.Errorf("failed to get payment order: %w", err)
	}
	account, err := dao.DBClient.GetAccount(types.UserQueryOpts{UID: userUID})
	if err != nil {
		return fmt.Errorf("failed to get account: %w", err)
	}
	if err := sendUserPayEmail(userUID, &utils.EmailPayRender{
		Type:           payType,
		Domain:         dao.DBClient.GetLocalRegion().Domain,
		TopUpAmount:    order.Amount / 1_000_000,
		AccountBalance: (account.Balance - account.DeductionBalance) / 1_000_000,
	}); err != nil {
		return err
	}
	return nil
}

func newCardPaymentFailureHandler(paymentRequestID string) error {
	_, err := dao.DBClient.NewCardPaymentFailureHandler(paymentRequestID)
	if err != nil {
		return err
	}
	// if userUID != uuid.Nil {
	//	if err := SendUserPayEmail(userUID, utils.EnvPayFailedEmailTmpl); err != nil {
	//		logrus.Errorf("Failed to send PAY_FAILED_EMAIL_TMPL email to %s: %v", userUID, err)
	//	}
	//}
	return nil
}

func newCardSubscriptionPaymentHandler(paymentReqID string, card types.CardInfo) error {
	userUID, err := dao.DBClient.NewCardSubscriptionPaymentHandler(paymentReqID, card)
	if err != nil {
		return err
	}
	if userUID != uuid.Nil {
		if err = sendUserSubPayEmailWith(userUID); err != nil {
			logrus.Errorf("Failed to send SUB_SUCCESS_EMAIL_TMPL email to %s: %v", userUID, err)
		}
	}
	return nil
}

func sendUserSubPayEmailWith(userUID uuid.UUID) error {
	lastSubTransaction, err := dao.DBClient.GetLastSubscriptionTransaction(userUID)
	if err != nil {
		return fmt.Errorf("failed to get last subscription transaction: %w", err)
	}
	if lastSubTransaction.PayStatus != types.SubscriptionPayStatusPaid &&
		lastSubTransaction.PayStatus != types.SubscriptionPayStatusNoNeed {
		return fmt.Errorf(
			"last subscription transaction pay status is not paid: %v",
			lastSubTransaction.PayStatus,
		)
	}

	if err := sendUserPayEmail(userUID, &utils.EmailSubRender{
		Type:                 utils.EnvSubSuccessEmailTmpl,
		Operator:             lastSubTransaction.Operator,
		Domain:               dao.DBClient.GetLocalRegion().Domain,
		SubscriptionPlanName: lastSubTransaction.NewPlanName,
		StartDate:            lastSubTransaction.StartAt,
		EndDate:              lastSubTransaction.StartAt.AddDate(0, 1, 0),
	}); err != nil {
		return fmt.Errorf("failed to send SUB_SUCCESS_EMAIL_TMPL email to %s: %w", userUID, err)
	}
	return nil
}

func newCardSubscriptionPaymentFailureHandler(paymentRequestID string) error {
	_, err := dao.DBClient.NewCardSubscriptionPaymentFailureHandler(paymentRequestID)
	if err != nil {
		return err
	}
	// if userUID != uuid.Nil {
	//	if err := SendUserPayEmail(userUID, utils.EnvSubFailedEmailTmpl); err != nil {
	//		logrus.Errorf("Failed to send SUB_FAILED_EMAIL_TMPL email to %s: %v", userUID, err)
	//	}
	//}
	return nil
}

func processSubscriptionPayResult(
	c *gin.Context,
	notifyType string,
	notifyResult types.Result,
	paymentRequestID, paymentID string,
) error {
	return processPaymentResultWithHandler(
		c,
		notifyType,
		notifyResult,
		paymentRequestID,
		paymentID,
		newCardSubscriptionPaymentHandler,
		newCardSubscriptionPaymentFailureHandler,
	)
}

func processPaymentResultWithHandler(
	c *gin.Context,
	notifyType string,
	notifyResult types.Result,
	paymentRequestID, paymentID string,
	paySuccessHandler func(paymentID string, card types.CardInfo) error,
	payFailureHandler func(paymentRequestID string) error,
) error {
	if notifyType == types.NotifyTypePaymentResult &&
		notifyResult.ResultCode == types.OrderClosedResultCode {
		err := payFailureHandler(paymentRequestID)
		if err != nil {
			sendError(c, http.StatusInternalServerError, "failed to set payment order status", err)
		} else {
			sendSuccessResponse(c)
		}
		return err
	}
	if notifyType != types.NotifyTypeCaptureResult {
		return nil
	}
	resp, err := dao.PaymentService.GetPayment(paymentRequestID, paymentID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "failed to get payment", err)
		return err
	}
	if paymentRequestID == "" || paymentID == "" {
		sendError(c, http.StatusBadRequest, "payment request id or payment id is empty", nil)
		return errors.New("payment request id or payment id is empty")
	}
	if notifyResult.ResultCode != SuccessStatus || notifyResult.ResultStatus != "S" {
		err = payFailureHandler(paymentRequestID)
		if err != nil {
			sendError(c, http.StatusInternalServerError, "failed to set payment order status", err)
		} else {
			sendSuccessResponse(c)
		}
		return err
	}
	if resp.Result.ResultCode != SuccessStatus || resp.Result.ResultStatus != "S" {
		return fmt.Errorf("payment result is not SUCCESS: %#+v", resp.Result)
	}

	card := types.CardInfo{
		ID:                   uuid.New(),
		CardNo:               resp.PaymentResultInfo.CardNo,
		CardBrand:            resp.PaymentResultInfo.CardBrand,
		CardToken:            resp.PaymentResultInfo.CardToken,
		NetworkTransactionID: resp.PaymentResultInfo.NetworkTransactionId,
	}

	if err = paySuccessHandler(paymentRequestID, card); err != nil {
		return err
	}
	return nil
}

// 辅助函数：发送成功响应
func sendSuccessResponse(c *gin.Context) {
	if c.Writer.Written() {
		return
	}
	resp := types.NewSuccessResponse()
	if _, err := c.Writer.Write(resp.Raw()); err != nil {
		sendError(c, http.StatusInternalServerError, "failed to write response", err)
		return
	}
	c.Status(http.StatusOK)
}
