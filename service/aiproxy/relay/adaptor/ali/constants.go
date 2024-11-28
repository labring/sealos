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
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxInputTokensKey:   30720,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "qwen-vl-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "qwen-coder-turbo",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-coder-turbo-latest",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-max",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxInputTokensKey:   30720,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-turbo",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-turbo-latest",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 10000000,
			model.ModelConfigMaxInputTokensKey:   10000000,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-long",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0005,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 10000000,
			model.ModelConfigMaxInputTokensKey:   10000000,
			model.ModelConfigMaxOutputTokensKey:  6000,
		},
	},
}
