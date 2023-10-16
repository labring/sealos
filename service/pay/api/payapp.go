package api

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/handler"
	"github.com/labring/sealos/service/pay/helper"
	"go.mongodb.org/mongo-driver/mongo"
)

func CreatePayApp(c *gin.Context, client *mongo.Client) {
	request, err := helper.Init(c, client)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before create payapp: %v, %v", request, err)})
		return
	}

	appName := request.PayAppName
	// check if the app Name already exists in appcoll
	if err := handler.CheckAppNameExistOrNot(client, appName); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("app name already exists: %v", err)})
		return
	}

	// generate sign
	data := []byte(appName + time.Now().Format("20060102150405"))
	hash := sha256.Sum256(data)
	sign := hex.EncodeToString(hash[:7])
	// generate appID
	data = []byte(sign + time.Now().Format("20060102150405"))
	hash = sha256.Sum256(data)
	var appID int64
	_, err = fmt.Sscanf(hex.EncodeToString(hash[:7]), "%16x", &appID)
	if err != nil {
		fmt.Println("appID could not be generated:", err)
		return
	}
	// TODO At present, only wechat and stripe are supported, and then you can consider extending them
	methods := []string{"wechat", "stripe"}

	result, err := handler.InsertApp(client, appID, sign, appName, methods)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("create pay app failed when insert into db: %v", err)})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":    "create pay app success",
		"payAppName": appName,
		"appID":      appID,
		"sign":       sign,
		"result":     result,
	})
}
