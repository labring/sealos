package method

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"github.com/labring/sealos/controllers/pkg/pay"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/stripe/stripe-go/v74"
	"go.mongodb.org/mongo-driver/mongo"
)

var DefaultURL = fmt.Sprintf("https://%s", GetEnvWithDefault("DOMAIN", helper.DefaultDomain))

func GetEnvWithDefault(s string, domain string) string {
	if value, ok := os.LookupEnv(s); ok {
		return value
	}
	return domain
}

func GetStripeSession(c *gin.Context, request *helper.Request, client *mongo.Client) {
	amountStr := request.Amount
	amount, err := strconv.ParseInt(amountStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error amount : %d, %v", amount, err)})
		return
	}

	// check the database paymethod and report an error if there is no corresponding payment method
	if _, err := handler.CheckPayMethodExistOrNot(client, request.Currency, request.PayMethod); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is not exist: %v", err)})
		return
	}
	// check the app collection to see if the cluster is allowed to use this payment method
	if err := handler.CheckAppAllowOrNot(client, request.AppID, helper.Stripe); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error pay method or currency in this app : %v", err)})
		return
	}

	session, err := pay.CreateCheckoutSession(amount, pay.CNY, DefaultURL+os.Getenv(helper.StripeSuccessPostfix), DefaultURL+os.Getenv(helper.StripeCancelPostfix))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("error session : %v", err)})
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
	orderID, err := handler.InsertDetails(client, user, helper.Stripe, amountStr, currency, appID, stripeDetails)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("insert stripe payment details failed: %s, %v", session.ID, err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "get stripe sessionID success",
		"sessionID": session.ID,
		"amount":    amountStr,
		"currency":  currency,
		"user":      user,
		"orderID":   orderID,
	})
}

func GetStripePaymentStatus(c *gin.Context, request *helper.Request, client *mongo.Client) {
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
	session, err := pay.GetSession(request.SessionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get stripe session failed: %v, %v", session, err)})
		return
	}

	switch session.Status {
	case stripe.CheckoutSessionStatusComplete:
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
	case stripe.CheckoutSessionStatusExpired:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentExpired)
	case stripe.CheckoutSessionStatusOpen:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentNotPaid)
	default:
		handler.UpdateDBIfDiff(c, request.OrderID, client, status, pay.PaymentUnknown)
	}
}
