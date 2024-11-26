package moonshot

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "moonshot-v1-8k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "moonshot-v1-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "moonshot-v1-128k",
		Type:  relaymode.ChatCompletions,
	},
}
