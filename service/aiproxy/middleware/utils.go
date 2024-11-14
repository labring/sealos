package middleware

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
)

func abortWithMessage(c *gin.Context, statusCode int, message string) {
	c.JSON(statusCode, gin.H{
		"error": gin.H{
			"message": helper.MessageWithRequestId(message, c.GetString(helper.RequestIdKey)),
			"type":    "aiproxy_error",
		},
	})
	c.Abort()
	logger.Error(c.Request.Context(), message)
}

func getRequestModel(c *gin.Context) (string, error) {
	path := c.Request.URL.Path
	switch {
	case strings.HasPrefix(path, "/v1/moderations"):
		return "text-moderation-stable", nil
	case strings.HasSuffix(path, "embeddings"):
		return c.Param("model"), nil
	case strings.HasPrefix(path, "/v1/images/generations"):
		return "dall-e-2", nil
	case strings.HasPrefix(path, "/v1/audio/transcriptions"), strings.HasPrefix(path, "/v1/audio/translations"):
		return c.Request.FormValue("model"), nil
	default:
		var modelRequest ModelRequest
		err := common.UnmarshalBodyReusable(c, &modelRequest)
		if err != nil {
			return "", fmt.Errorf("get request model failed: %w", err)
		}
		return modelRequest.Model, nil
	}
}
