package togetherai

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://docs.together.ai/docs/inference-models

var ModelList = []*model.ModelConfig{
	{
		Model: "meta-llama/Llama-3-70b-chat-hf",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "deepseek-ai/deepseek-coder-33b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
	{
		Model: "mistralai/Mixtral-8x22B-Instruct-v0.1",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "Qwen/Qwen1.5-72B-Chat",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
}

type Adaptor struct {
	openai.Adaptor
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}
