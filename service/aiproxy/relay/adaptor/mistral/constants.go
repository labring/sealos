package mistral

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "open-mistral-7b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "open-mixtral-8x7b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "mistral-small-latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "mistral-medium-latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "mistral-large-latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "mistral-embed",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerMistral,
	},
}
