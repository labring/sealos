package novita

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://novita.ai/llm-api

var ModelList = []*model.ModelConfig{
	{
		Model: "meta-llama/llama-3-8b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "meta-llama/llama-3-70b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "nousresearch/hermes-2-pro-llama-3-8b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "nousresearch/nous-hermes-llama2-13b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "mistralai/mistral-7b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "teknium/openhermes-2.5-mistral-7b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "microsoft/wizardlm-2-8x22b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMicrosoft,
	},
}
