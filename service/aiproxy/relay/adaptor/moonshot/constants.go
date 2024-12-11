package moonshot

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "moonshot-v1-8k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMoonshot,
		InputPrice:  0.012,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
	{
		Model:       "moonshot-v1-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMoonshot,
		InputPrice:  0.024,
		OutputPrice: 0.024,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 32768,
		},
	},
	{
		Model:       "moonshot-v1-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMoonshot,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 131072,
		},
	},
}
