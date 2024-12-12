package lingyiwanwu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.lingyiwanwu.com/docs

var ModelList = []*model.ModelConfig{
	{
		Model:       "yi-lightning",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.00099,
		OutputPrice: 0.00099,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
	{
		Model:       "yi-large",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
		},
	},
	{
		Model:       "yi-medium",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.0025,
		OutputPrice: 0.0025,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
	{
		Model:       "yi-vision",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.006,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
	{
		Model:       "yi-medium-200k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.012,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 204800,
		},
	},
	{
		Model:       "yi-spark",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
	{
		Model:       "yi-large-rag",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.025,
		OutputPrice: 0.025,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
	{
		Model:       "yi-large-fc",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
		},
	},
	{
		Model:       "yi-large-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.012,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 16384,
		},
	},
}
