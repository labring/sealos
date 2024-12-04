package middleware

import (
	"fmt"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type ModelRequest struct {
	Model string `form:"model" json:"model"`
}

func Distribute(c *gin.Context) {
	if config.GetDisableServe() {
		abortWithMessage(c, http.StatusServiceUnavailable, "service is under maintenance")
		return
	}

	requestModel, err := getRequestModel(c)
	if err != nil {
		abortWithMessage(c, http.StatusBadRequest, err.Error())
		return
	}
	if requestModel == "" {
		abortWithMessage(c, http.StatusBadRequest, "no model provided")
		return
	}

	token := c.MustGet(ctxkey.Token).(*model.TokenCache)
	if len(token.Models) == 0 || !slices.Contains(token.Models, requestModel) {
		abortWithMessage(c,
			http.StatusForbidden,
			fmt.Sprintf("token (%s[%d]) has no permission to use model: %s",
				token.Name, token.ID, requestModel,
			),
		)
		return
	}
	channel, err := model.CacheGetRandomSatisfiedChannel(requestModel)
	if err != nil {
		message := requestModel + " is not available"
		abortWithMessage(c, http.StatusServiceUnavailable, message)
		return
	}

	c.Set(ctxkey.OriginalModel, requestModel)
	c.Set(ctxkey.Channel, channel)

	c.Next()
}

func NewMetaByContext(c *gin.Context) *meta.Meta {
	channel := c.MustGet(ctxkey.Channel).(*model.Channel)
	originalModel := c.GetString(ctxkey.OriginalModel)
	requestID := c.GetString(string(helper.RequestIDKey))
	group := c.MustGet(ctxkey.Group).(*model.GroupCache)
	token := c.MustGet(ctxkey.Token).(*model.TokenCache)
	return meta.NewMeta(
		channel,
		relaymode.GetByPath(c.Request.URL.Path),
		originalModel,
		meta.WithRequestID(requestID),
		meta.WithGroup(group),
		meta.WithToken(token),
	)
}
