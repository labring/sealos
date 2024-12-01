package cohere

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "command",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
	{
		Model: "command-nightly",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
	{
		Model: "command-light",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
	{
		Model: "command-light-nightly",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
	{
		Model: "command-r",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
	{
		Model: "command-r-plus",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerCohere,
	},
}
