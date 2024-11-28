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
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  1024,
		},
	},
	{
		Model:       "ERNIE-3.5-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  1024,
		},
	},
	{
		Model:       "ERNIE-Tiny-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  1024,
		},
	},
	{
		Model:       "ERNIE-Speed-8K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  1024,
		},
	},
	{
		Model:       "ERNIE-Speed-128K",
		Type:        relaymode.ChatCompletions,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model: "BLOOMZ-7B",
		Type:  relaymode.ChatCompletions,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4800,
		},
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
