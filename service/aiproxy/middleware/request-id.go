package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/helper"
)

func RequestID(c *gin.Context) {
	id := helper.GenRequestID()
	c.Set(string(helper.RequestIDKey), id)
	c.Header(string(helper.RequestIDKey), id)
	log := GetLogger(c)
	SetLogRequestIDField(log.Data, id)
	c.Next()
}
