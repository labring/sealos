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
		Model: "hunyuan-standard",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerTencent,
	},
	{
		Model: "hunyuan-standard-256K",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerTencent,
	},
	{
		Model: "hunyuan-pro",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerTencent,
	},
	{
		Model: "hunyuan-vision",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerTencent,
	},
}
