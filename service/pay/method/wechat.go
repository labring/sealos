package method

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/pay"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetWechatURL(c *gin.Context, request *helper.Request, client *mongo.Client) {
	amountStr := request.Amount
	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error amount : %d, %v", amount, err)})
		return
	}

	// check the database paymethod and report an error if there is no corresponding payment method
	if _, err := handler.CheckPayMethodExistOrNot(client, request.Currency, helper.Wechat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error paymethod : %v", err)})
		return
	}
	// check the app collection to see if the cluster is allowed to use this payment method
	if err := handler.CheckAppAllowOrNot(client, request.AppID, helper.Wechat); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error pay method or currency in this app : %v", err)})
		return
	}

	user := request.User
	tradeNO := pay.GetRandomString(32)
	codeURL, err := pay.WechatPay(amount, user, tradeNO, "", "")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error codeURL : %s, %v", codeURL, err)})
		return
	}
	appID := request.AppID
	currency := request.Currency
	wechatDetails := map[string]interface{}{
		"tradeNO": tradeNO,
		"codeURL": codeURL,
	}

	// Ensure that these operations are atomic, meaning that if the lower operation fails,
	// the upper operation must be rolled back
	// helper.Insert Payment Details and helper.Insert Order Details are placed in a transaction helper.Insert Details,
	// and if either fails, they are rolled back

	// insert payment details into database
	orderID, err := handler.InsertDetails(client, user, helper.Wechat, amountStr, currency, appID, wechatDetails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("insert wechat payment details failed: %s, %v", codeURL, err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":  "get wechat url success",
		"codeURL":  codeURL,
		"tradeNO":  tradeNO,
		"amount":   amountStr,
		"currency": currency,
		"user":     user,
		"orderID":  orderID,
	})
}

func GetWechatPaymentStatus(c *gin.Context, request *helper.Request, client *mongo.Client) {
	// Firstly, check whether the order exists in the order Details, if not, directly return
	if err := handler.CheckOrderExistOrNot(client, request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("order does not exist: %v", err)})
		return
	}

	// check the payment status in the database first
	status, err := handler.GetPaymentStatus(client, request.OrderID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get payment status failed from db: %s, %v", status, err)})
		return
	}
	// If the payment has been successful, return directly
	if status == pay.PaymentSuccess {
		c.JSON(http.StatusOK, gin.H{
			"message": "payment has been successfully completed",
			"status":  status,
			"orderID": request.OrderID,
		})
		return
	}

	// If it is not successful, then go to the payment provider server query
	orderResp, err := pay.QueryOrder(request.TradeNO)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("query order failed when get wechat payment status: %v, %v", orderResp, err)})
		return
	}
	switch *orderResp.TradeState {
	case pay.StatusSuccess:
		// change the status of the database to pay.Payment Success
		paymentStatus, err := handler.UpdatePaymentStatus(client, request.OrderID, pay.PaymentSuccess)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("update payment status failed when wechat order status is success: %s, %v", paymentStatus, err),
			})
			return
		}
		c.JSON(http.StatusOK, gin.H{
			"message": "payment has been successfully completed, database has been updated",
			"status":  pay.PaymentSuccess,
			"orderID": request.OrderID,
		})
		return
	case pay.StatusProcessing:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentProcessing)
	case pay.StatusNotPay:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentNotPaid)
	case pay.StatusFail:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentFailed)
	default:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentUnknown)
	}
}
