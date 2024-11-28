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
	},
	{
		Model: "meta-llama/llama-3-70b-instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "nousresearch/hermes-2-pro-llama-3-8b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "nousresearch/nous-hermes-llama2-13b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mistralai/mistral-7b-instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "cognitivecomputations/dolphin-mixtral-8x22b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "sao10k/l3-70b-euryale-v2.1",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "sophosympatheia/midnight-rose-70b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gryphe/mythomax-l2-13b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Nous-Hermes-2-Mixtral-8x7B-DPO",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "lzlv_70b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "teknium/openhermes-2.5-mistral-7b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "microsoft/wizardlm-2-8x22b",
		Type:  relaymode.ChatCompletions,
	},
}
