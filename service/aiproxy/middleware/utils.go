package middleware

import (
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

const (
	ErrorTypeAIPROXY = "aiproxy_error"
)

func abortWithMessage(c *gin.Context, statusCode int, message string) {
	GetLogger(c).Error(message)
	c.JSON(statusCode, gin.H{
		"error": &model.Error{
			Message: helper.MessageWithRequestID(message, c.GetString(string(helper.RequestIDKey))),
			Type:    ErrorTypeAIPROXY,
		},
	})
	c.Abort()
}

func getRequestModel(c *gin.Context) (string, error) {
	path := c.Request.URL.Path
	switch {
	case strings.HasPrefix(path, "/v1/audio/transcriptions"), strings.HasPrefix(path, "/v1/audio/translations"):
		return c.Request.FormValue("model"), nil
	case strings.HasPrefix(path, "/v1/engines") && strings.HasSuffix(path, "/embeddings"):
		// /engines/:model/embeddings
		return c.Param("model"), nil
	default:
		var modelRequest ModelRequest
		err := common.UnmarshalBodyReusable(c.Request, &modelRequest)
		if err != nil {
			return "", fmt.Errorf("get request model failed: %w", err)
		}
		return modelRequest.Model, nil
	}
}
