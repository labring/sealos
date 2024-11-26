package baidu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "ERNIE-4.0-8K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-3.5-8K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-3.5-8K-0205",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-3.5-8K-1222",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-Bot-8K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-Lite-8K-0308",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-Tiny-8K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-Speed-8K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "ERNIE-Speed-128K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "BLOOMZ-7B",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Embedding-V1",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "bge-large-zh",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "bge-large-en",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "tao-8k",
		Type:  relaymode.Embeddings,
	},
}
