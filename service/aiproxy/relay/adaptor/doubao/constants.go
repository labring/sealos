package doubao

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://console.volcengine.com/ark/region:ark+cn-beijing/model

var ModelList = []*model.ModelConfig{
	{
		Model:       "Doubao-pro-256k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0050,
		OutputPrice: 0.0090,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 256000,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-pro-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0050,
		OutputPrice: 0.0090,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-pro-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-pro-4k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-lite-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0010,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-lite-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "Doubao-lite-4k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},

	{
		Model:      "Doubao-embedding",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerDoubao,
		InputPrice: 0.0005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 4096,
		},
	},
	{
		Model:      "Doubao-embedding-large",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerDoubao,
		InputPrice: 0.0007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 4096,
		},
	},
}
