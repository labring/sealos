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
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey:  64000,
			model.ModelConfigMaxOutputTokensKey: 4096,
		},
	},
	{
		Model: "deepseek-coder",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
}
