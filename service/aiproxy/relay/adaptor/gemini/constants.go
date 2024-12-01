package gemini

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://ai.google.dev/models/gemini

var ModelList = []*model.ModelConfig{
	{
		Model: "gemini-pro",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-1.0-pro",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-1.5-flash",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-1.5-pro",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "text-embedding-004",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "aqa",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
}
