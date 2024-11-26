package ai360

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "360GPT_S2_V9",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "embedding-bert-512-v1",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "embedding_s1_v1",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "semantic_similarity_s1_v1",
		Type:  relaymode.Embeddings,
	},
}
