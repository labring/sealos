package baichuan

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "Baichuan2-Turbo",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerBaichuan,
	},
	{
		Model: "Baichuan2-Turbo-192k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerBaichuan,
	},
	{
		Model: "Baichuan-Text-Embedding",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerBaichuan,
	},
}
