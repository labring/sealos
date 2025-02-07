package deepseek

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "deepseek-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDeepSeek,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		RPM:         10000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(64000),
			model.WithModelConfigMaxOutputTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},

	{
		Model:       "deepseek-reasoner",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerDeepSeek,
		InputPrice:  0.004,
		OutputPrice: 0.016,
		RPM:         10000,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(64000),
			model.WithModelConfigMaxOutputTokens(8192),
		),
	},
}
