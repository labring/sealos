package moonshot

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "moonshot-v1-8k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.012,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
	{
		Model:       "moonshot-v1-32k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.024,
		OutputPrice: 0.024,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 32768,
		},
	},
	{
		Model:       "moonshot-v1-128k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 131072,
		},
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.moonshot.cn"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}
	return a.Adaptor.GetRequestURL(meta)
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "moonshot"
}
