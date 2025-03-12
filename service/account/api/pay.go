package api

import (
	"fmt"
	"net/http"

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
			card, err := dao.DBClient.GetCardInfo(req.BindCardInfo.CardUID)
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
			}, nil, func() error {
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
				Status: types.ProcessingInvoiceStatus,
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

func NewPayNotificationHandler(c *gin.Context) {
	var notification types.PaymentNotification
	err := c.ShouldBind(&notification)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprint("failed to parse request: ", err)})
		return
	}
	paymentRequestID, paymentID := notification.PaymentRequestID, notification.PaymentID

	if notification.Result.ResultCode != SuccessStatus || notification.Result.ResultStatus != "S" {
		if err = dao.DBClient.SetPaymentOrderStatusWithTradeNo(types.PaymentOrderStatusFailed, paymentRequestID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to set payment order status: ", err)})
			return
		}
	} else {
		resp, err := dao.PaymentService.GetPayment(paymentRequestID, paymentID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to get payment: ", err)})
			return
		}
		if resp.Result.ResultCode != SuccessStatus || resp.Result.ResultStatus != "S" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("payment result is not SUCCESS: %#+v", resp.Result)})
			return
		}
		paymentResultInfo := resp.PaymentResultInfo
		card := types.CardInfo{
			ID:                   uuid.New(),
			CardNo:               paymentResultInfo.CardNo,
			CardBrand:            paymentResultInfo.CardBrand,
			CardToken:            paymentResultInfo.CardToken,
			NetworkTransactionID: paymentResultInfo.NetworkTransactionId,
		}

		err = dao.DBClient.NewCardPaymentHandler(paymentRequestID, card)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprint("failed to handle payment: ", err)})
			return
		}
	}
	c.JSON(http.StatusOK, "success")
}
