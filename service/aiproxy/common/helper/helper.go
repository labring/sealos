package helper

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/random"
)

func GenRequestID() string {
	return GetTimeString() + random.GetRandomNumberString(8)
}

func GetResponseID(c *gin.Context) string {
	logID := c.GetString(RequestIdKey)
	return fmt.Sprintf("chatcmpl-%s", logID)
}

func AssignOrDefault(value string, defaultValue string) string {
	if len(value) != 0 {
		return value
	}
	return defaultValue
}

func MessageWithRequestId(message string, id string) string {
	return fmt.Sprintf("%s (request id: %s)", message, id)
}
