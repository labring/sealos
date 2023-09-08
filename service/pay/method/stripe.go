package method

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/pkg/pay"
	"github.com/labring/sealos/service/pay/conf"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/stripe/stripe-go/v74"
)

func GetStripeSession(c *gin.Context, request *conf.Request) {
	amountStr := request.Amount
	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error amount : %d, %v", amount, err)})
		return
	}

	// check the database paymethod and report an error if there is no corresponding payment method
	if _, err := helper.CheckPayMethodExistOrNot(request.Currency, request.PayMethod); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is not exist: %v", err)})
		return
	}
	// check the app collection to see if the cluster is allowed to use this payment method
	if err := helper.CheckAppAllowOrNot(request.AppID, conf.Stripe); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error pay method or currency in this app : %v", err)})
		return
	}

	session, err := pay.CreateCheckoutSession(amount, pay.CNY, pay.DefaultSuccessURL, pay.DefaultSuccessURL)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error session : %v", err)})
		return
	}

	appID := request.AppID
	user := request.User
	currency := request.Currency
	stripeDetails := map[string]interface{}{
		"sessionID": session.ID,
	}
	// Ensure that these operations are atomic, meaning that if the lower operation fails,
	// the upper operation must be rolled back
	// helper.Insert Payment Details and helper.Insert Order Details are placed in a transaction helper.Insert Details,
	// and if either fails, they are rolled back

	// insert payment details into database
	orderID, err := helper.InsertDetails(user, conf.Stripe, amountStr, currency, appID, stripeDetails)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("insert stripe payment details failed: %s, %v", session.ID, err)})
		return
	}

	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message":   "get stripe sessionID success",
		"sessionID": session.ID,
		"amount":    amountStr,
		"currency":  currency,
		"user":      user,
		"orderID":   orderID,
	})
	return
}

func GetStripePaymentStatus(c *gin.Context, request *conf.Request) {
	// Firstly, check whether the order exists in the order Details, if not, directly return
	if err := helper.CheckOrderExistOrNot(request); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("order does not exist: %v", err)})
		return
	}
	// check the payment status in the database first
	status, err := helper.GetPaymentStatus(request.OrderID)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get payment status failed from db: %s, %v", status, err)})
		return
	}
	// If the payment has been successful, return directly
	if status == pay.PaymentSuccess {
		c.AbortWithStatusJSON(http.StatusOK, gin.H{
			"message": "payment has been successfully completed",
			"status":  status,
			"orderID": request.OrderID,
		})
		return
	}
	// If it is not successful, then go to the payment provider server query
	session, err := pay.GetSession(request.SessionID)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get stripe session failed: %v, %v", session, err)})
		return
	}

	switch session.Status {
	case stripe.CheckoutSessionStatusComplete:
		// change the status of the database to pay.Payment Success
		paymentStatus, err := helper.UpdatePaymentStatus(request.OrderID, pay.PaymentSuccess)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": fmt.Sprintf("update payment status failed when wechat order status is success: %s, %v", paymentStatus, err),
			})
			return
		}
		c.AbortWithStatusJSON(http.StatusOK, gin.H{
			"message": "payment has been successfully completed, database has been updated",
			"status":  pay.PaymentSuccess,
			"orderID": request.OrderID,
		})
		return
	case stripe.CheckoutSessionStatusExpired:
		helper.UpdateDBIfDiff(c, request.OrderID, status, pay.PaymentExpired)
	case stripe.CheckoutSessionStatusOpen:
		helper.UpdateDBIfDiff(c, request.OrderID, status, pay.PaymentNotPaid)
	default:
		helper.UpdateDBIfDiff(c, request.OrderID, status, pay.PaymentUnknown)
	}
}
