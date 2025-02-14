package baichuan

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "Baichuan4-Turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaichuan,
		InputPrice:  0.015,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
		),
	},
	{
		Model:       "Baichuan4-Air",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaichuan,
		InputPrice:  0.00098,
		OutputPrice: 0.00098,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
		),
	},
	{
		Model:       "Baichuan4",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaichuan,
		InputPrice:  0.1,
		OutputPrice: 0.1,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
		),
	},
	{
		Model:       "Baichuan3-Turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaichuan,
		InputPrice:  0.012,
		OutputPrice: 0.012,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
		),
	},
	{
		Model:       "Baichuan3-Turbo-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaichuan,
		InputPrice:  0.024,
		OutputPrice: 0.024,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},

	{
		Model:      "Baichuan-Text-Embedding",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerBaichuan,
		InputPrice: 0.0005,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(512),
		),
	},
}
