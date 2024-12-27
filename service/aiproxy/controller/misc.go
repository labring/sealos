package controller

import (
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
)

type StatusData struct {
	StartTime int64 `json:"startTime"`
}

func GetStatus(c *gin.Context) {
	middleware.SuccessResponse(c, &StatusData{
		StartTime: common.StartTime,
	})
}
