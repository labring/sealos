package middleware

import (
	"net/http"
	"slices"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
)

type ModelRequest struct {
	Model string `form:"model" json:"model"`
}

func Distribute(c *gin.Context) {
	if config.GetDisableServe() {
		abortWithMessage(c, http.StatusServiceUnavailable, "service is under maintenance")
		return
	}
	requestModel := c.GetString(ctxkey.RequestModel)
	var channel *model.Channel
	channelID, ok := c.Get(ctxkey.SpecificChannelID)
	if ok {
		id, err := strconv.Atoi(channelID.(string))
		if err != nil {
			abortWithMessage(c, http.StatusBadRequest, "invalid channel ID")
			return
		}
		channel, ok = model.CacheGetChannelByID(id)
		if !ok {
			abortWithMessage(c, http.StatusBadRequest, "invalid channel ID")
			return
		}
		if !slices.Contains(channel.Models, requestModel) {
			abortWithMessage(c, http.StatusServiceUnavailable, channel.Name+" does not support "+requestModel)
			return
		}
	} else {
		var err error
		channel, err = model.CacheGetRandomSatisfiedChannel(requestModel)
		if err != nil {
			message := requestModel + " is not available"
			abortWithMessage(c, http.StatusServiceUnavailable, message)
			return
		}
	}
	SetupContextForSelectedChannel(c, channel, requestModel)
	c.Next()
}

func SetupContextForSelectedChannel(c *gin.Context, channel *model.Channel, modelName string) {
	c.Set(ctxkey.Channel, channel.Type)
	c.Set(ctxkey.ChannelID, channel.ID)
	c.Set(ctxkey.APIKey, channel.Key)
	c.Set(ctxkey.ChannelName, channel.Name)
	c.Set(ctxkey.ModelMapping, channel.ModelMapping)
	c.Set(ctxkey.OriginalModel, modelName) // for retry
	c.Set(ctxkey.BaseURL, channel.BaseURL)
	cfg := channel.Config
	// this is for backward compatibility
	if channel.Other != "" {
		switch channel.Type {
		case channeltype.Azure:
			if cfg.APIVersion == "" {
				cfg.APIVersion = channel.Other
			}
		case channeltype.Gemini:
			if cfg.APIVersion == "" {
				cfg.APIVersion = channel.Other
			}
		case channeltype.AIProxyLibrary:
			if cfg.LibraryID == "" {
				cfg.LibraryID = channel.Other
			}
		case channeltype.Ali:
			if cfg.Plugin == "" {
				cfg.Plugin = channel.Other
			}
		}
	}
	c.Set(ctxkey.Config, cfg)
}
