package minimax

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://www.minimaxi.com/document/guides/chat-model/V2?id=65e0736ab2845de20908e2dd

var ModelList = []*model.ModelConfigItem{
	{
		Model:       "abab6.5s-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.001,
		OutputPrice: 0,
	},
	{
		Model:       "abab6.5g-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0,
	},
	{
		Model:       "abab6.5t-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0,
	},
	{
		Model:       "abab5.5s-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.005,
		OutputPrice: 0,
	},
	{
		Model:       "abab5.5-chat",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.015,
		OutputPrice: 0,
	},
}
