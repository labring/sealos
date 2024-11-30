package baichuan

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "Baichuan2-Turbo",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Baichuan2-Turbo-192k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Baichuan-Text-Embedding",
		Type:  relaymode.Embeddings,
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.baichuan-ai.com"

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
	return "baichuan"
}
