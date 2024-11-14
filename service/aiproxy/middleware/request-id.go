package middleware

import (
	"context"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/helper"
)

func RequestID(c *gin.Context) {
	id := helper.GenRequestID()
	c.Set(string(helper.RequestIDKey), id)
	ctx := context.WithValue(c.Request.Context(), helper.RequestIDKey, id)
	c.Request = c.Request.WithContext(ctx)
	c.Header(string(helper.RequestIDKey), id)
	c.Next()
}
