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
	return fmt.Sprintf("%s (request id: %s)", message, id)
}

func abortWithMessage(c *gin.Context, statusCode int, message string) {
	GetLogger(c).Error(message)
	c.JSON(statusCode, gin.H{
		"error": &model.Error{
			Message: MessageWithRequestID(message, GetRequestID(c)),
			Type:    ErrorTypeAIPROXY,
		},
	})
	c.Abort()
}
