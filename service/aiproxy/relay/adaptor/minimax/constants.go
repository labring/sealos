package minimax

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://www.minimaxi.com/document/guides/chat-model/V2?id=65e0736ab2845de20908e2dd

var ModelList = []*model.ModelConfig{
	{
		Model:       "abab7-chat-preview",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 245760,
		},
	},
	{
		Model:       "abab6.5s-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 245760,
		},
	},
	{
		Model:       "abab6.5g-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "abab6.5t-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "abab5.5s-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "abab5.5-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.015,
		OutputPrice: 0.015,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
}
