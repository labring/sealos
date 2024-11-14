package middleware

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
)

type ModelRequest struct {
	Model string `json:"model" form:"model"`
}

func Distribute(c *gin.Context) {
	if config.GetDisableServe() {
		abortWithMessage(c, http.StatusServiceUnavailable, "服务暂停中")
		return
	}
	group := c.GetString(ctxkey.Group)
	requestModel := c.GetString(ctxkey.RequestModel)
	var channel *model.Channel
	channelID, ok := c.Get(ctxkey.SpecificChannelID)
	if ok {
		id, err := strconv.Atoi(channelID.(string))
		if err != nil {
			abortWithMessage(c, http.StatusBadRequest, "无效的渠道 Id")
			return
		}
		channel, err = model.GetChannelByID(id, false)
		if err != nil {
			abortWithMessage(c, http.StatusBadRequest, "无效的渠道 Id")
			return
		}
		if channel.Status != model.ChannelStatusEnabled {
			abortWithMessage(c, http.StatusForbidden, "该渠道已被禁用")
			return
		}
	} else {
		var err error
		channel, err = model.CacheGetRandomSatisfiedChannel(requestModel)
		if err != nil {
			message := fmt.Sprintf("当前分组 %s 下对于模型 %s 无可用渠道", group, requestModel)
			if channel != nil {
				logger.SysError(fmt.Sprintf("渠道不存在：%d", channel.ID))
				message = "数据库一致性已被破坏，请联系管理员"
			}
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
