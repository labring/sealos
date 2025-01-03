package lingyiwanwu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.lingyiwanwu.com/docs

var ModelList = []*model.ModelConfig{
	{
		Model:       "yi-lightning",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.00099,
		OutputPrice: 0.00099,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(16384),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "yi-vision-v2",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerLingyiWanwu,
		InputPrice:  0.006,
		OutputPrice: 0.006,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(16384),
			model.WithModelConfigVision(true),
			model.WithModelConfigToolChoice(true),
		),
	},
}
