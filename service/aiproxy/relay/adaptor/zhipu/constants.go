package zhipu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "glm-3-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
		),
	},
	{
		Model:       "glm-4",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.1,
		OutputPrice: 0.1,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.05,
		OutputPrice: 0.05,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-air",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-airx",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.01,
		OutputPrice: 0.01,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-long",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(1024000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-flashx",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4-flash",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "glm-4v-flash",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(8192),
			model.WithModelConfigMaxOutputTokens(1024),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "glm-4v",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.05,
		OutputPrice: 0.05,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(2048),
			model.WithModelConfigMaxOutputTokens(1024),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "glm-4v-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.01,
		OutputPrice: 0.01,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(8192),
			model.WithModelConfigMaxOutputTokens(1024),
			model.WithModelConfigVision(true),
		),
	},

	{
		Model:       "charglm-3",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.015,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4096),
			model.WithModelConfigMaxOutputTokens(2048),
		),
	},
	{
		Model:       "emohaa",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.015,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigMaxOutputTokens(4096),
		),
	},
	{
		Model:       "codegeex-4",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerChatGLM,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigMaxOutputTokens(4096),
		),
	},

	{
		Model:      "embedding-2",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerChatGLM,
		InputPrice: 0.0005,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(8192),
		),
	},
	{
		Model:      "embedding-3",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerChatGLM,
		InputPrice: 0.0005,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(8192),
		),
	},

	{
		Model:             "cogview-3",
		Type:              relaymode.ImagesGenerations,
		Owner:             model.ModelOwnerChatGLM,
		ImageMaxBatchSize: 1,
		ImagePrices: map[string]float64{
			"1024x1024": 0.1,
		},
		Config: model.NewModelConfig(
			model.WithModelConfigMaxOutputTokens(1024),
		),
	},
	{
		Model:             "cogview-3-plus",
		Type:              relaymode.ImagesGenerations,
		Owner:             model.ModelOwnerChatGLM,
		ImageMaxBatchSize: 1,
		ImagePrices: map[string]float64{
			"1024x1024": 0.06,
			"768x1344":  0.06,
			"864x1152":  0.06,
			"1344x768":  0.06,
			"1152x864":  0.06,
			"1440x720":  0.06,
			"720x1440":  0.06,
		},
		Config: model.NewModelConfig(
			model.WithModelConfigMaxOutputTokens(1024),
		),
	},
}
