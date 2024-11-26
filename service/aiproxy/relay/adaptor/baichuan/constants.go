package baichuan

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "Baichuan2-Turbo",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Baichuan2-Turbo-192k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Baichuan-Text-Embedding",
		Type:  relaymode.Embeddings,
	},
}
