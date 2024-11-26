package cohere

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "command",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "command-nightly",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "command-light",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "command-light-nightly",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "command-r",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "command-r-plus",
		Type:  relaymode.ChatCompletions,
	},
}
