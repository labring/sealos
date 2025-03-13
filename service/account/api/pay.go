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
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprint("failed to parse request: ", err)})
		return
	}
	if err := authenticateRequest(c, req); err != nil {
		c.JSON(http.StatusUnauthorized, helper.ErrorMessage{Error: fmt.Sprintf("authenticate error : %v", err)})
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
			card, err := dao.DBClient.GetCardInfo(req.BindCardInfo.CardUID, req.UserUID)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get card info: ", err)})
				return
			}
			if card.CardNo != req.BindCardInfo.CardNo || card.CardBrand != req.BindCardInfo.CardBrand {
				c.JSON(http.StatusBadRequest, gin.H{"error": "card info not match"})
				return
			}

			err = dao.DBClient.PaymentWithFunc(&types.Payment{
				PaymentRaw: types.PaymentRaw{
					UserUID:   req.UserUID,
					Amount:    req.Amount,
					Method:    req.Method,
					RegionUID: dao.DBClient.GetLocalRegion().UID,
					TradeNO:   paySvcResp.PaymentRequestId,
					CodeURL:   paySvcResp.NormalUrl,
					Type:      types.PaymentTypeAccountRecharge,
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
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
				return
			}
			c.JSON(http.StatusOK, gin.H{
				"data": "success",
			})
		} else {
			paySvcResp, err = dao.PaymentService.CreateNewPayment(paymentReq)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment: ", err)})
				return
			}
			if paySvcResp.Result.ResultCode != "PAYMENT_IN_PROCESS" || paySvcResp.Result.ResultStatus != "U" {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("payment result is not PAYMENT_IN_PROCESS: %#+v", paySvcResp.Result)})
				return
			}

			// do something
			err = dao.DBClient.CreatePaymentOrder(&types.PaymentOrder{
				PaymentRaw: types.PaymentRaw{
					UserUID:   req.UserUID,
					Amount:    req.Amount,
					Method:    req.Method,
					RegionUID: dao.DBClient.GetLocalRegion().UID,
					TradeNO:   paySvcResp.PaymentRequestId,
					CodeURL:   paySvcResp.NormalUrl,
					Type:      types.PaymentTypeAccountRecharge,
				},
				Status: types.PaymentOrderStatusPending,
			})
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to create payment order: ", err)})
				return
			}
		}
		//paySvcResp
		c.JSON(http.StatusOK, gin.H{"data": helper.CreatePayResp{
			RedirectURL: paySvcResp.NormalUrl,
		}})
		return
	}

	c.JSON(http.StatusBadGateway, gin.H{"error": "unsupported payment method"})
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
func logNotification(notification types.PaymentNotification) {
	if prettyJSON, err := json.MarshalIndent(notification, "", "    "); err != nil {
		logrus.Errorf("Failed to marshal notification: %v", err)
	} else {
		logrus.Infof("Notify: %s", string(prettyJSON))
	}
}

// 辅助函数：处理支付结果
func processPaymentResult(c *gin.Context, notification types.PaymentNotification) error {
	return processPaymentResultWithHandler(c, notification, dao.DBClient.NewCardPaymentHandler)
}

func processSubscriptionPayResult(c *gin.Context, notification types.PaymentNotification) error {
	return processPaymentResultWithHandler(c, notification, dao.DBClient.NewCardSubscriptionPaymentHandler)
}

func processPaymentResultWithHandler(c *gin.Context, notification types.PaymentNotification, handler func(paymentID string, card types.CardInfo) error) error {
	paymentRequestID := notification.PaymentRequestID
	paymentID := notification.PaymentID
	if notification.NotifyType != "CAPTURE_RESULT" {
		return nil
	}
	if notification.Result.ResultCode != SuccessStatus || notification.Result.ResultStatus != "S" {
		return updatePaymentStatus(c, paymentRequestID, types.PaymentOrderStatusFailed)
	}

	resp, err := dao.PaymentService.GetPayment(paymentRequestID, paymentID)
	if err != nil {
		sendError(c, http.StatusInternalServerError, "failed to get payment", err)
		return err
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

func updatePaymentStatus(c *gin.Context, paymentRequestID string, status types.PaymentOrderStatus) error {
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
