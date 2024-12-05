package meta

import (
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/labring/sealos/service/aiproxy/model"
)

type ChannelMeta struct {
	Config  model.ChannelConfig
	Name    string
	BaseURL string
	Key     string
	ID      int
	Type    int
}

type Meta struct {
	values  map[string]any
	Channel *ChannelMeta
	Group   *model.GroupCache
	Token   *model.TokenCache

	RequestAt       time.Time
	RequestID       string
	OriginModelName string
	ActualModelName string
	Mode            int
	PromptTokens    int
	IsChannelTest   bool
}

type Option func(meta *Meta)

func WithChannelTest(isChannelTest bool) Option {
	return func(meta *Meta) {
		meta.IsChannelTest = isChannelTest
	}
}

func WithRequestID(requestID string) Option {
	return func(meta *Meta) {
		meta.RequestID = requestID
	}
}

func WithRequestAt(requestAt time.Time) Option {
	return func(meta *Meta) {
		meta.RequestAt = requestAt
	}
}

func WithGroup(group *model.GroupCache) Option {
	return func(meta *Meta) {
		meta.Group = group
	}
}

func WithToken(token *model.TokenCache) Option {
	return func(meta *Meta) {
		meta.Token = token
	}
}

func NewMeta(channel *model.Channel, mode int, modelName string, opts ...Option) *Meta {
	meta := Meta{
		values:          make(map[string]any),
		Mode:            mode,
		OriginModelName: modelName,
		RequestAt:       time.Now(),
	}

	for _, opt := range opts {
		opt(&meta)
	}

	meta.Reset(channel)

	return &meta
}

func (m *Meta) Reset(channel *model.Channel) {
	m.Channel = &ChannelMeta{
		Config:  channel.Config,
		Name:    channel.Name,
		BaseURL: channel.BaseURL,
		Key:     channel.Key,
		ID:      channel.ID,
		Type:    channel.Type,
	}
	m.ActualModelName, _ = GetMappedModelName(m.OriginModelName, channel.ModelMapping)
	m.ClearValues()
}

func (m *Meta) ClearValues() {
	clear(m.values)
}

func (m *Meta) Set(key string, value any) {
	m.values[key] = value
}

func (m *Meta) Get(key string) (any, bool) {
	v, ok := m.values[key]
	return v, ok
}

func (m *Meta) Delete(key string) {
	delete(m.values, key)
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
