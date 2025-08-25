package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetBill(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get bills: %v, %v", request, err)})
		return
	}

	billDetails, err := handler.GetBillDetails(request, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get bill details failed : %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":     "get the bill details of user(" + request.User + ") success",
		"billDetails": billDetails,
	})
}
