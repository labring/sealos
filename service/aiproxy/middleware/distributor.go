package middleware

import (
	"context"
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

	log := GetLogger(c)

	requestModel, err := getRequestModel(c)
	if err != nil {
		abortWithMessage(c, http.StatusBadRequest, err.Error())
		return
	}
	if requestModel == "" {
		abortWithMessage(c, http.StatusBadRequest, "no model provided")
		return
	}

	SetLogModelFields(log.Data, requestModel)

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
		abortWithMessage(c, http.StatusServiceUnavailable, requestModel+" is not available")
		return
	}

	c.Set(string(ctxkey.OriginalModel), requestModel)
	ctx := context.WithValue(c.Request.Context(), ctxkey.OriginalModel, requestModel)
	c.Request = c.Request.WithContext(ctx)
	c.Set(ctxkey.Channel, channel)

	c.Next()
}

func NewMetaByContext(c *gin.Context) *meta.Meta {
	channel := c.MustGet(ctxkey.Channel).(*model.Channel)
	originalModel := c.MustGet(string(ctxkey.OriginalModel)).(string)
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
