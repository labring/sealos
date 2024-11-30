package mistral

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "open-mistral-7b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "open-mixtral-8x7b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistral-small-latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistral-medium-latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistral-large-latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistral-embed",
		Type:  relaymode.Embeddings,
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.mistral.ai"

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
	return "mistral"
}
