package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
)

func CreatePayMethod(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before create paymethod: %v, %v", request, err)})
		return
	}
	if ok, err := helper.CheckPayMethodExistOrNot(request.Currency, request.PayMethod); ok == true && err == nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("paymethod is exist")})
		return
	}

	result, err := helper.InsertPayMethod(request)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("create pay method failed when insert into db: %v", err)})
		return
	}

	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message": "create pay method success",
		"result":  result,
	})
	return
}

//TODO 更改某个支付方式的 金额 或 汇率 或 税率
