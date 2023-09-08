package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
)

func GetAppDetails(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get app details: %v, %v", request, err)})
		return
	}
	payDetails, err := helper.GetAppDetails(request)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get app details failed : %v", err)})
		return
	}

	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message":    "get app details success",
		"payDetails": payDetails,
	})
	return
}
