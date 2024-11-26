package gemini

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://ai.google.dev/models/gemini

var ModelList = []*model.ModelConfigItem{
	{
		Model: "gemini-pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-1.0-pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-1.5-flash",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-1.5-pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "text-embedding-004",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "aqa",
		Type:  relaymode.ChatCompletions,
	},
}
