package controller

import (
	"net/http"

	"github.com/labring/sealos/service/aiproxy/common"

	"github.com/gin-gonic/gin"
)

func GetStatus(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data": gin.H{
			"start_time": common.StartTime,
		},
	})
}
