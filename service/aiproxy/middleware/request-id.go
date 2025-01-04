package middleware

import (
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/random"
)

func GenRequestID() string {
	return strconv.FormatInt(time.Now().UnixMilli(), 10) + random.GetRandomNumberString(4)
}

func SetRequestID(c *gin.Context, id string) {
	c.Set(ctxkey.RequestID, id)
	c.Header(ctxkey.RequestID, id)
	log := GetLogger(c)
	SetLogRequestIDField(log.Data, id)
}

func GetRequestID(c *gin.Context) string {
	return c.GetString(ctxkey.RequestID)
}

func RequestID(c *gin.Context) {
	id := GenRequestID()
	SetRequestID(c, id)
}
