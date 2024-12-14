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
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(64000),
			model.WithModelConfigMaxOutputTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
}
