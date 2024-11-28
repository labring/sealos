package togetherai

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://docs.together.ai/docs/inference-models

var ModelList = []*model.ModelConfig{
	{
		Model: "meta-llama/Llama-3-70b-chat-hf",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "deepseek-ai/deepseek-coder-33b-instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistralai/Mixtral-8x22B-Instruct-v0.1",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen1.5-72B-Chat",
		Type:  relaymode.ChatCompletions,
	},
}
