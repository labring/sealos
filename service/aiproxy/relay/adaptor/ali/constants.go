package ali

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "qwen-vl-max",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-vl-plus",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-coder-turbo",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-coder-turbo-latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-max",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-plus",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-turbo",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen-long",
		Type:  relaymode.ChatCompletions,
	},
}
