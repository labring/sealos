package doubao

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://console.volcengine.com/ark/region:ark+cn-beijing/model

var ModelList = []*model.ModelConfigItem{
	{
		Model:       "Doubao-pro-128k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0050,
		OutputPrice: 0.0090,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
	{
		Model:       "Doubao-pro-32k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
		},
	},
	{
		Model:       "Doubao-pro-4k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
		},
	},
	{
		Model:       "Doubao-lite-128k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.0010,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
	{
		Model:       "Doubao-lite-32k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
		},
	},
	{
		Model:       "Doubao-lite-4k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
		},
	},
	{
		Model: "Doubao-embedding",
		Type:  relaymode.Embeddings,
	},
}
