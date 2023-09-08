package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/labring/sealos/service/pay/method"
	"go.mongodb.org/mongo-driver/mongo"
)

// GetSession Get url from payment service providers (such as WeChat and Stripe)
func GetSession(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get paysession: %v, %v", request, err)})
		return
	}

	switch request.PayMethod {
	case "wechat":
		method.GetWechatURL(c, request, client)
	case "stripe":
		method.GetStripeSession(c, request, client)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is illegal: %v", request.PayMethod)})
	}
	//TODO 目前微信和stripe的货币貌似都是CNY（Currency不管填什么，都是RMB），之后如果有其他货币的话，这里需要改一下
}
