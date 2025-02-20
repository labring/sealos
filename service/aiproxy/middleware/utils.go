package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

const (
	ErrorTypeAIPROXY = "aiproxy_error"
)

func MessageWithRequestID(message string, id string) string {
	return fmt.Sprintf("%s (aiproxy: %s)", message, id)
}

func abortLogWithMessage(c *gin.Context, statusCode int, message string) {
	GetLogger(c).Error(message)
	abortWithMessage(c, statusCode, message)
}

func abortWithMessage(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"error": &model.Error{
			Message: MessageWithRequestID(message, GetRequestID(c)),
			Type:    ErrorTypeAIPROXY,
		},
	})
	c.Abort()
}
