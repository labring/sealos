package doubao

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://console.volcengine.com/ark/region:ark+cn-beijing/model

var ModelList = []*model.ModelConfigItem{
	{
		Model: "Doubao-pro-128k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-pro-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-pro-4k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-lite-128k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-lite-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-lite-4k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Doubao-embedding",
		Type:  relaymode.Embeddings,
	},
}
