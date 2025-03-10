package middleware

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

const (
	ErrorTypeAIPROXY = "aiproxy_error"
)

func MessageWithRequestID(c *gin.Context, message string) string {
	return fmt.Sprintf("%s (aiproxy: %s)", message, GetRequestID(c))
}

func abortLogWithMessage(c *gin.Context, statusCode int, message string, fields ...*errorField) {
	GetLogger(c).Error(message)
	abortWithMessage(c, statusCode, message, fields...)
}

type errorField struct {
	Type string `json:"type"`
	Code any    `json:"code"`
}

func abortWithMessage(c *gin.Context, statusCode int, message string, fields ...*errorField) {
	typeName := ErrorTypeAIPROXY
	var code any = nil
	if len(fields) > 0 {
		if fields[0].Type != "" {
			typeName = fields[0].Type
		}
		code = fields[0].Code
	}
	c.JSON(statusCode, gin.H{
		"error": &model.Error{
			Message: MessageWithRequestID(c, message),
			Type:    typeName,
			Code:    code,
		},
	})
	c.Abort()
}
