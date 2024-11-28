package ali

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "qwen-vl-max",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.02,
		OutputPrice: 0,
	},
	{
		Model:       "qwen-vl-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.008,
		OutputPrice: 0,
	},
	{
		Model:       "qwen-coder-turbo",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.002,
		OutputPrice: 0.006,
	},
	{
		Model:       "qwen-coder-turbo-latest",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.002,
		OutputPrice: 0.006,
	},
	{
		Model:       "qwen-max",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.02,
		OutputPrice: 0.06,
	},
	{
		Model:       "qwen-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
	},
	{
		Model:       "qwen-turbo",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
	},
	{
		Model:       "qwen-long",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0005,
		OutputPrice: 0.002,
	},
}
