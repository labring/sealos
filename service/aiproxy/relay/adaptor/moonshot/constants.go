package moonshot

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model:       "moonshot-v1-8k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.012,
		OutputPrice: 0,
	},
	{
		Model:       "moonshot-v1-32k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.024,
		OutputPrice: 0,
	},
	{
		Model:       "moonshot-v1-128k",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.06,
		OutputPrice: 0,
	},
}
