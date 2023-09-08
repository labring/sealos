package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/labring/sealos/service/pay/method"
)

// GetSession Get url from payment service providers (such as WeChat and Stripe)
func GetSession(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get session: %v, %v", request, err)})
		return
	}

	switch request.PayMethod {
	case "wechat":
		method.GetWechatURL(c, request)
	case "stripe":
		method.GetStripeSession(c, request)
	default:
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is illegal: %v", request.PayMethod)})
	}
}
