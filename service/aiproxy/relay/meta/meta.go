package meta

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Meta struct {
	values  map[string]any
	Channel *model.Channel
	Group   *model.GroupCache
	Token   *model.TokenCache

	RequestAt       time.Time
	RequestID       string
	OriginModelName string
	ActualModelName string
	RequestURLPath  string
	Mode            int
	PromptTokens    int
	IsChannelTest   bool
}

func (m *Meta) Set(key string, value any) {
	m.values[key] = value
}

func (m *Meta) Get(key string) (any, bool) {
	v, ok := m.values[key]
	return v, ok
}

func (m *Meta) MustGet(key string) any {
	v, ok := m.Get(key)
	if !ok {
		panic(fmt.Sprintf("meta key %s not found", key))
	}
	return v
}

func (m *Meta) GetString(key string) string {
	v, ok := m.Get(key)
	if !ok {
		return ""
	}
	s, _ := v.(string)
	return s
}

func (m *Meta) GetBool(key string) bool {
	if v, ok := m.Get(key); ok {
		return v.(bool)
	}
	return false
}

func (m *Meta) AwsClient() *bedrockruntime.Client {
	if v, ok := m.Get("awsClient"); ok {
		return v.(*bedrockruntime.Client)
	}
	awsClient := bedrockruntime.New(bedrockruntime.Options{
		Region:      m.Channel.Config.Region,
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(m.Channel.Config.AK, m.Channel.Config.SK, "")),
	})
	m.Set("awsClient", awsClient)
	return awsClient
}

func GetByContext(c *gin.Context) *Meta {
	meta := Meta{
		values:          make(map[string]any),
		RequestAt:       time.Now(),
		RequestID:       c.GetString(string(helper.RequestIDKey)),
		RequestURLPath:  c.Request.URL.String(),
		OriginModelName: c.GetString(ctxkey.OriginalModel),
		IsChannelTest:   c.GetBool(ctxkey.ChannelTest),
	}

	meta.Channel = c.MustGet(ctxkey.Channel).(*model.Channel)
	meta.ActualModelName, _ = GetMappedModelName(meta.OriginModelName, meta.Channel.ModelMapping)

	if mode, ok := c.Get(ctxkey.Mode); ok {
		meta.Mode = mode.(int)
	} else {
		meta.Mode = relaymode.GetByPath(c.Request.URL.Path)
	}

	if group, ok := c.Get(ctxkey.Group); ok {
		meta.Group = group.(*model.GroupCache)
	}
	if token, ok := c.Get(ctxkey.Token); ok {
		meta.Token = token.(*model.TokenCache)
	}

	return &meta
}

//nolint:unparam
func GetMappedModelName(modelName string, mapping map[string]string) (string, bool) {
	if len(modelName) == 0 {
		return modelName, false
	}
	mappedModelName := mapping[modelName]
	if mappedModelName != "" {
		return mappedModelName, true
	}
	return modelName, false
}
