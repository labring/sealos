package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/mongo"
)

func GetAppDetails(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before get app details: %v, %v", request, err)})
		return
	}

	payDetails, err := handler.GetAppDetails(request, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("get app details failed : %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "get app details success",
		"payDetails": payDetails,
	})
}
