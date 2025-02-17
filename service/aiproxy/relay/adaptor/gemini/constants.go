package gemini

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://ai.google.dev/models/gemini
// https://ai.google.dev/gemini-api/docs/pricing

var ModelList = []*model.ModelConfig{
	{
		Model:       "gemini-1.5-pro",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.0025,
		OutputPrice: 0.01,
		RPM:         120,
	},
	{
		Model:       "gemini-1.5-flash",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.00015,
		OutputPrice: 0.0006,
		RPM:         120,
	},
	{
		Model:       "gemini-1.5-flash-8b",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.000075,
		OutputPrice: 0.0003,
		RPM:         120,
	},
	{
		Model:       "gemini-2.0-flash",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.0001,
		OutputPrice: 0.0004,
		RPM:         120,
	},
	{
		Model:       "gemini-2.0-flash-lite-preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.000075,
		OutputPrice: 0.0003,
		RPM:         120,
	},
	{
		Model:       "gemini-2.0-flash-thinking-exp",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.0001,
		OutputPrice: 0.0004,
		RPM:         120,
	},
	{
		Model:       "gemini-2.0-pro-exp",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerGoogle,
		InputPrice:  0.0025,
		OutputPrice: 0.01,
		RPM:         120,
	},

	{
		Model:      "text-embedding-004",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerGoogle,
		InputPrice: 0.0001,
		RPM:        300,
	},
}
