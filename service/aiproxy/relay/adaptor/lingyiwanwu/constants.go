package lingyiwanwu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.lingyiwanwu.com/docs

var ModelList = []*model.ModelConfig{
	{
		Model: "yi-34b-chat-0205",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "yi-34b-chat-200k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "yi-vl-plus",
		Type:  relaymode.ChatCompletions,
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.lingyiwanwu.com"

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
	return "lingyiwanwu"
}
