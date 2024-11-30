package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

func RelayPanicRecover(c *gin.Context) {
	defer func() {
		if err := recover(); err != nil {
			ctx := c.Request.Context()
			logger.Errorf(ctx, "panic detected: %v", err)
			logger.Errorf(ctx, "stacktrace from panic: %s", debug.Stack())
			logger.Errorf(ctx, "request: %s %s", c.Request.Method, c.Request.URL.Path)
			body, _ := common.GetRequestBody(c.Request)
			logger.Errorf(ctx, "request body: %s", body)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"message": fmt.Sprintf("Panic detected, error: %v.", err),
					"type":    "aiproxy_panic",
				},
			})
			c.Abort()
		}
	}()
	c.Next()
}
