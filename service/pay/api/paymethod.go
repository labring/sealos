package api

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreatePayMethod(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before create paymethod: %v, %v", request, err)})
		return
	}

	if ok, err := handler.CheckPayMethodExistOrNot(client, request.Currency, request.PayMethod); ok && err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "paymethod is exist"})
		return
	}

	result, err := handler.InsertPayMethod(request, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("create pay method failed when insert into db: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "create pay method success",
		"result":  result,
	})
}

// TODO Change the amount or exchange rate or tax rate for a payment method
