package baidu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "ERNIE-4.0-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.03,
		OutputPrice: 0.09,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "ERNIE-3.5-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
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
		Model:       "ERNIE-Tiny-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "ERNIE-Speed-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
		},
	},
	{
		Model:       "ERNIE-Speed-128K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
		},
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
