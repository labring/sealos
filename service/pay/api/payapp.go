package api

import (
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/pay/helper"
)

func CreatePayApp(c *gin.Context) {
	request, err := helper.Init(c)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("init failed before create payapp: %v, %v", request, err)})
		return
	}

	appName := request.PayAppName
	// check if the app Name already exists in appcoll
	if err := helper.CheckAppNameExistOrNot(appName); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("app name already exists: %v", err)})
		return
	}

	// generate sign
	data := []byte(appName + time.Now().Format("20060102150405"))
	hash := md5.Sum(data)
	sign := hex.EncodeToString(hash[:7])
	// generate appID
	data = []byte(sign + time.Now().Format("20060102150405"))
	hash = md5.Sum(data)
	var appID int64
	_, err = fmt.Sscanf(hex.EncodeToString(hash[:7]), "%16x", &appID)
	if err != nil {
		fmt.Println("appID could not be generated:", err)
		return
	}
	// TODO 目前仅支持wechat和stripe两种方式 之后可以考虑扩展
	methods := []string{"wechat", "stripe"}

	result, err := helper.InsertApp(appID, sign, appName, methods)
	if err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("create pay app failed when insert into db: %v", err)})
		return
	}

	c.AbortWithStatusJSON(http.StatusOK, gin.H{
		"message":    "create pay app success",
		"payAppName": appName,
		"appID":      appID,
		"sign":       sign,
		"result":     result,
	})
	return
}
