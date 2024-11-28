package zhipu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "glm-4",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.1,
		OutputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.05,
		OutputPrice: 0.05,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-air",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-airx",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.01,
		OutputPrice: 0.01,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-long",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 1000000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-flashx",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4-flash",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4095,
		},
	},
	{
		Model:       "glm-4v",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.05,
		OutputPrice: 0.05,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 2048,
		},
	},
	{
		Model:       "glm-4v-plus",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.01,
		OutputPrice: 0.01,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
	{
		Model:      "embedding-3",
		Type:       relaymode.Embeddings,
		InputPrice: 0.0005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
	{
		Model:             "cogview-3",
		Type:              relaymode.ImagesGenerations,
		ImageMaxBatchSize: 1,
		ImagePrices: map[string]float64{
			"1024x1024": 0.1,
		},
	},
	{
		Model:             "cogview-3-plus",
		Type:              relaymode.ImagesGenerations,
		ImageMaxBatchSize: 1,
		ImagePrices: map[string]float64{
			"1024x1024": 0.06,
			"768x1344":  0.06,
			"864x1152":  0.06,
		},
	},
}
