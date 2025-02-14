package anthropic

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "claude-3-haiku-20240307",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.0025,
		OutputPrice: 0.0125,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(4096),
		),
	},
	{
		Model:       "claude-3-opus-20240229",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.015,
		OutputPrice: 0.075,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(4096),
		),
	},
	{
		Model:       "claude-3-5-haiku-20241022",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.0008,
		OutputPrice: 0.004,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "claude-3-5-sonnet-20240620",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.003,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "claude-3-5-sonnet-20241022",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.003,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "claude-3-5-sonnet-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAnthropic,
		InputPrice:  0.003,
		OutputPrice: 0.015,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(200000),
			model.WithModelConfigMaxOutputTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
}
