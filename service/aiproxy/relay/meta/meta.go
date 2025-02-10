package meta

import (
	"fmt"
	"time"

	"github.com/labring/sealos/service/aiproxy/model"
)

type ChannelMeta struct {
	Name    string
	BaseURL string
	Key     string
	ID      int
	Type    int
}

type Meta struct {
	values        map[string]any
	Channel       *ChannelMeta
	ChannelConfig model.ChannelConfig
	Group         *model.GroupCache
	Token         *model.TokenCache
	ModelConfig   *model.ModelConfig

	Endpoint      string
	RequestAt     time.Time
	RequestID     string
	OriginModel   string
	ActualModel   string
	Mode          int
	InputTokens   int
	IsChannelTest bool
}

type Option func(meta *Meta)

func WithEndpoint(endpoint string) Option {
	return func(meta *Meta) {
		meta.Endpoint = endpoint
	}
}

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

func NewMeta(
	channel *model.Channel,
	mode int,
	modelName string,
	modelConfig *model.ModelConfig,
	opts ...Option,
) *Meta {
	meta := Meta{
		values:      make(map[string]any),
		Mode:        mode,
		OriginModel: modelName,
		ActualModel: modelName,
		RequestAt:   time.Now(),
		ModelConfig: modelConfig,
	}

	for _, opt := range opts {
		opt(&meta)
	}

	if channel != nil {
		meta.Reset(channel)
	}

	return &meta
}

func (m *Meta) Reset(channel *model.Channel) {
	m.Channel = &ChannelMeta{
		Name:    channel.Name,
		BaseURL: channel.BaseURL,
		Key:     channel.Key,
		ID:      channel.ID,
		Type:    channel.Type,
	}
	if channel.Config != nil {
		m.ChannelConfig = *channel.Config
	}
	m.ActualModel, _ = GetMappedModelName(m.OriginModel, channel.ModelMapping)
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
	v, ok := m.Get(key)
	if !ok {
		return false
	}
	b, _ := v.(bool)
	return b
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
