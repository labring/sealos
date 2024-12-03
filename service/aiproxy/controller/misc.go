package controller

import (
	"net/http"

	"github.com/labring/sealos/service/aiproxy/common"

	"github.com/gin-gonic/gin"
)

type StatusData struct {
	StartTime int64 `json:"startTime"`
}

func GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": &StatusData{
			StartTime: common.StartTime,
		},
	})
}
