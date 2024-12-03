package tencent

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "hunyuan-lite",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerTencent,
	},
	{
		Model:       "hunyuan-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.015,
		OutputPrice: 0.05,
	},
	{
		Model:       "hunyuan-pro",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.03,
		OutputPrice: 0.10,
	},
	{
		Model:       "hunyuan-large",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.004,
		OutputPrice: 0.012,
	},
	{
		Model:       "hunyuan-large-longcontext",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.006,
		OutputPrice: 0.018,
	},
	{
		Model:       "hunyuan-standard",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
	},
	// {
	// 	Model:       "hunyuan-standard-256K",
	// 	Type:        relaymode.ChatCompletions,
	// 	Owner:       model.ModelOwnerTencent,
	// 	InputPrice:  0.0005,
	// 	OutputPrice: 0.002,
	// },
	{
		Model:       "hunyuan-role",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.004,
		OutputPrice: 0.008,
	},
	{
		Model:       "hunyuan-functioncall",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.004,
		OutputPrice: 0.008,
	},
	{
		Model:       "hunyuan-code",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.004,
		OutputPrice: 0.008,
	},
	{
		Model:       "hunyuan-turbo-vision",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.08,
		OutputPrice: 0.08,
	},
	{
		Model:       "hunyuan-vision",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerTencent,
		InputPrice:  0.018,
		OutputPrice: 0.018,
	},

	{
		Model:      "hunyuan-embedding",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerTencent,
		InputPrice: 0.0007,
	},
}
