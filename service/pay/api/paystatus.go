package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/labring/sealos/service/pay/method"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetPayStatus(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get payment status: %v, %v", request, err)})
		return
	}

	switch request.PayMethod {
	case "wechat":
		method.GetWechatPaymentStatus(c, request, client)
	case "stripe":
		method.GetStripePaymentStatus(c, request, client)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is illegal: %v", request.PayMethod)})
	}
	// TODO The other status of this area except notpaid has not been tested, and it will be tested later
}
