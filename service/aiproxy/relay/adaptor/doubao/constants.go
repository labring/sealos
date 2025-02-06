package doubao

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://console.volcengine.com/ark/region:ark+cn-beijing/model

var ModelList = []*model.ModelConfig{
	{
		Model:       "Doubao-1.5-vision-pro-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.003,
		OutputPrice: 0.009,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(32768),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "Doubao-1.5-pro-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(32768),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-1.5-pro-256k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.005,
		OutputPrice: 0.009,
		RPM:         2000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(256000),
			model.WithModelConfigMaxOutputTokens(12000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-1.5-lite-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},

	{
		Model:       "Doubao-vision-lite-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(32768),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "Doubao-vision-pro-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(32768),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "Doubao-pro-256k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0050,
		OutputPrice: 0.0090,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(256000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-pro-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0050,
		OutputPrice: 0.0090,
		RPM:         1000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(128000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-pro-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-pro-4k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0020,
		RPM:         10000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4096),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-lite-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0008,
		OutputPrice: 0.0010,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(128000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-lite-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		RPM:         15000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "Doubao-lite-4k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDoubao,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		RPM:         10000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4096),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},

	{
		Model:      "Doubao-embedding",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerDoubao,
		InputPrice: 0.0005,
		RPM:        1200,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(4096),
		),
	},
	{
		Model:      "Doubao-embedding-large",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerDoubao,
		InputPrice: 0.0007,
		RPM:        1000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(4096),
		),
	},
}
