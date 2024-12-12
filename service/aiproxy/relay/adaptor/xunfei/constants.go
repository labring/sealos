package xunfei

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "SparkDesk-4.0-Ultra",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.14,
		OutputPrice: 0.14,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
	{
		Model:       "SparkDesk-Lite",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
		},
	},
	{
		Model:       "SparkDesk-Max",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
	{
		Model:       "SparkDesk-Max-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.09,
		OutputPrice: 0.09,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
		},
	},
	{
		Model:       "SparkDesk-Pro",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.014,
		OutputPrice: 0.014,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
	{
		Model:       "SparkDesk-Pro-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.026,
		OutputPrice: 0.026,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 128000,
		},
	},
}
