package helper

import (
	"fmt"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/random"
)

func GenRequestID() string {
	return strconv.FormatInt(time.Now().UnixMilli(), 10) + random.GetRandomNumberString(4)
}

func GetResponseID(c *gin.Context) string {
	logID := c.GetString(string(RequestIDKey))
	return "chatcmpl-" + logID
}

func AssignOrDefault(value string, defaultValue string) string {
	if len(value) != 0 {
		return value
	}
	return defaultValue
}

func MessageWithRequestID(message string, id string) string {
	return fmt.Sprintf("%s (request id: %s)", message, id)
}

func String2Int(keyword string) int {
	if keyword == "" {
		return 0
	}
	i, err := strconv.Atoi(keyword)
	if err != nil {
		return 0
	}
	return i
}
