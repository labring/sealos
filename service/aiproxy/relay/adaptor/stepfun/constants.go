package stepfun

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "step-1-8k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1-128k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1-256k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1-flash",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-2-16k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1v-8k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1v-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "step-1x-medium",
		Type:  relaymode.ChatCompletions,
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.stepfun.com"

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
	return "stepfun"
}
