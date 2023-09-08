package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
	"github.com/labring/sealos/service/pay/method"
)

func GetPayStatus(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get payment status: %v, %v", request, err)})
		return
	}
	switch request.PayMethod {
	case "wechat":
		method.GetWechatPaymentStatus(c, request)
	case "stripe":
		method.GetStripePaymentStatus(c, request)
	default:
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is illegal: %v", request.PayMethod)})
	}
	//TODO 这一块别的状态除了notpaid还没有测过，之后得测一下
}
