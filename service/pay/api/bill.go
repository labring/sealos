package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
)

func GetBill(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get bills: %v, %v", request, err)})
		return
	}
	billDetails, err := helper.GetBillDetails(request)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get bill details failed : %v", err)})
		return
	}

	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message":     "get the bill details of user(" + request.User + ") success",
		"billDetails": billDetails,
	})
	return
}
