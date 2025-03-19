package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"gorm.io/gorm"

	"github.com/sirupsen/logrus"

	"github.com/google/uuid"

	responsePay "github.com/alipay/global-open-sdk-go/com/alipay/api/response/pay"

	services "github.com/labring/sealos/service/pkg/pay"

	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/service/account/dao"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/account/helper"
)

const SuccessStatus = "SUCCESS"

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
		SetErrorResp(c, http.StatusBadRequest, gin.H{"error": fmt.Sprint("failed to parse request: ", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		SetErrorResp(c, http.StatusUnauthorized, gin.H{"error": fmt.Sprint("authenticate error: ", err)})
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
		if req.BindCardInfo != nil {
			card, err := dao.DBClient.GetCardInfo(req.BindCardInfo.CardID, req.UserUID)
			if err != nil {
				SetErrorResp(c, http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get card info: ", err)})
				return
			}
			if card == nil {
				SetErrorResp(c, http.StatusBadRequest, gin.H{"error": "card not found"})
				return
			}
			err = dao.DBClient.PaymentWithFunc(&types.Payment{
				PaymentRaw: types.PaymentRaw{
					UserUID:      req.UserUID,
					Amount:       req.Amount,
					Method:       req.Method,
					RegionUID:    dao.DBClient.GetLocalRegion().UID,
					TradeNO:      paymentReq.RequestID,
					Type:         types.PaymentTypeAccountRecharge,
					ChargeSource: types.ChargeSourceBindCard,
				},
			}, nil, func(_ *gorm.DB) error {
				paySvcResp, err = dao.PaymentService.CreatePaymentWithCard(paymentReq, card)
				if err != nil {
					return fmt.Errorf("failed to create payment with card: %w", err)
				}
				if paySvcResp.Result.ResultCode != SuccessStatus || paySvcResp.Result.ResultStatus != "S" {
					return fmt.Errorf("payment result is not SUCCESS: %#+v", paySvcResp.Result)
				}
				return nil
			})
			if err != nil {
				SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
			} else {
				SetSuccessResp(c)
			}
			return
		} else {
			paySvcResp, err = dao.PaymentService.CreateNewPayment(paymentReq)
			if err != nil {
				SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
				return
			}
			if paySvcResp.Result.ResultCode != "PAYMENT_IN_PROCESS" || paySvcResp.Result.ResultStatus != "U" {
				SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprintf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)})
				return
			}

			// do something
			err = dao.DBClient.CreatePaymentOrder(&types.PaymentOrder{
				PaymentRaw: types.PaymentRaw{
					UserUID:      req.UserUID,
					Amount:       req.Amount,
					Method:       req.Method,
					RegionUID:    dao.DBClient.GetLocalRegion().UID,
					TradeNO:      paySvcResp.PaymentRequestId,
					CodeURL:      paySvcResp.NormalUrl,
					Type:         types.PaymentTypeAccountRecharge,
					ChargeSource: types.ChargeSourceNewCard,
				},
				Status: types.PaymentOrderStatusPending,
			})
			if err != nil {
				SetErrorResp(c, http.StatusConflict, gin.H{"error": fmt.Sprint("failed to create payment order: ", err)})
				return
			}
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

	logNotification(notification)

	if err := processPaymentResult(c, notification); err != nil {
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
func logNotification(notification types.CaptureNotification) {
	if prettyJSON, err := json.MarshalIndent(notification, "", "    "); err != nil {
		logrus.Errorf("Failed to marshal notification: %v", err)
	} else {
		logrus.Infof("Notify: %s", string(prettyJSON))
	}
}

// 辅助函数：处理支付结果
func processPaymentResult(c *gin.Context, notification types.CaptureNotification) error {
	return processPaymentResultWithHandler(c, notification, dao.DBClient.NewCardPaymentHandler)
}

func processSubscriptionPayResult(c *gin.Context, notification types.CaptureNotification) error {
	return processPaymentResultWithHandler(c, notification, dao.DBClient.NewCardSubscriptionPaymentHandler)
}

func processPaymentResultWithHandler(c *gin.Context, notification types.CaptureNotification, handler func(paymentID string, card types.CardInfo) error) error {
	paymentRequestID := notification.CaptureRequestID
	paymentID := notification.PaymentID
	if notification.NotifyType != "CAPTURE_RESULT" {
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
	if notification.Result.ResultCode != SuccessStatus || notification.Result.ResultStatus != "S" {
		return updatePaymentOrderStatus(c, paymentRequestID, types.PaymentOrderStatusFailed)
	}
	if resp.Result.ResultCode != SuccessStatus || resp.Result.ResultStatus != "S" {
		sendError(c, http.StatusInternalServerError,
			fmt.Sprintf("payment result is not SUCCESS: %#+v", resp.Result), nil)
		return errors.New("payment not successful")
	}

	card := types.CardInfo{
		ID:                   uuid.New(),
		CardNo:               resp.PaymentResultInfo.CardNo,
		CardBrand:            resp.PaymentResultInfo.CardBrand,
		CardToken:            resp.PaymentResultInfo.CardToken,
		NetworkTransactionID: resp.PaymentResultInfo.NetworkTransactionId,
	}

	if err := handler(paymentRequestID, card); err != nil {
		sendError(c, http.StatusInternalServerError, "failed to handle payment", err)
		return err
	}
	return nil
}

func updatePaymentOrderStatus(c *gin.Context, paymentRequestID string, status types.PaymentOrderStatus) error {
	if err := dao.DBClient.SetPaymentOrderStatusWithTradeNo(status, paymentRequestID); err != nil {
		sendError(c, http.StatusInternalServerError, "failed to set payment order status", err)
		return err
	}
	return nil
}

// 辅助函数：发送成功响应
func sendSuccessResponse(c *gin.Context) {
	resp := types.NewSuccessResponse()
	if _, err := c.Writer.Write(resp.Raw()); err != nil {
		sendError(c, http.StatusInternalServerError, "failed to write response", err)
		return
	}
	c.Status(http.StatusOK)
}
