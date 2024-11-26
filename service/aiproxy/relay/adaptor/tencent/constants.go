package tencent

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "hunyuan-lite",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "hunyuan-standard",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "hunyuan-standard-256K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "hunyuan-pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "hunyuan-vision",
		Type:  relaymode.ChatCompletions,
	},
}
