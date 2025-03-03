package xai

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "grok-3",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.002,
		OutputPrice: 0.01,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(1000000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "grok-3-deepsearch",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.01,
		OutputPrice: 0.05,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(1000000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "grok-3-reasoner",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.004,
		OutputPrice: 0.02,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(1000000),
		),
	},
	{
		Model:       "grok-2-1212",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.002,
		OutputPrice: 0.01,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},
	{
		Model:       "grok-2-vision-1212",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "grok-beta",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.03,
		OutputPrice: 0.12,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},
	{
		Model:       "grok-vision-beta",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXAI,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		RPM:         300,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigVision(true),
		),
	},
}
