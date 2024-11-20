package meta

import (
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Meta struct {
	ModelMapping    map[string]string
	Config          model.ChannelConfig
	APIKey          string
	OriginModelName string
	TokenName       string
	Group           string
	RequestURLPath  string
	BaseURL         string
	ActualModelName string
	ChannelID       int
	ChannelType     int
	APIType         int
	Mode            int
	TokenID         int
	PromptTokens    int
	IsStream        bool
}

func GetByContext(c *gin.Context) *Meta {
	meta := Meta{
		Mode:            relaymode.GetByPath(c.Request.URL.Path),
		ChannelType:     c.GetInt(ctxkey.Channel),
		ChannelID:       c.GetInt(ctxkey.ChannelID),
		TokenID:         c.GetInt(ctxkey.TokenID),
		TokenName:       c.GetString(ctxkey.TokenName),
		Group:           c.GetString(ctxkey.Group),
		ModelMapping:    c.GetStringMapString(ctxkey.ModelMapping),
		OriginModelName: c.GetString(ctxkey.RequestModel),
		BaseURL:         c.GetString(ctxkey.BaseURL),
		APIKey:          c.GetString(ctxkey.APIKey),
		RequestURLPath:  c.Request.URL.String(),
	}
	cfg, ok := c.Get(ctxkey.Config)
	if ok {
		meta.Config = cfg.(model.ChannelConfig)
	}
	if meta.BaseURL == "" {
		meta.BaseURL = channeltype.ChannelBaseURLs[meta.ChannelType]
	}
	meta.APIType = channeltype.ToAPIType(meta.ChannelType)
	return &meta
}
