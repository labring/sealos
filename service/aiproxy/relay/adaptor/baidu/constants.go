package baidu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "ERNIE-4.0-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
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
		Owner:       model.ModelOwnerBaidu,
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
		Owner:       model.ModelOwnerBaidu,
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
		Owner:       model.ModelOwnerBaidu,
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
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "BLOOMZ-7B",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.004,
		OutputPrice: 0.004,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4800,
		},
	},

	{
		Model:       "Embedding-V1",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
	},
	{
		Model:       "bge-large-zh",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBAAI,
		InputPrice:  0.0005,
		OutputPrice: 0,
	},
	{
		Model:       "bge-large-en",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBAAI,
		InputPrice:  0.0005,
		OutputPrice: 0,
	},
	{
		Model:       "tao-8k",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
	},

	{
		Model:       "bce-reranker-base_v1",
		Type:        relaymode.Rerank,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
	},

	{
		Model: "Stable-Diffusion-XL",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
		ImagePrices: map[string]float64{
			"768x768":   0.06,
			"576x1024":  0.06,
			"1024x576":  0.06,
			"768x1024":  0.08,
			"1024x768":  0.08,
			"1024x1024": 0.08,
			"1536x1536": 0.12,
			"1152x2048": 0.12,
			"2048x1152": 0.12,
			"1536x2048": 0.16,
			"2048x1536": 0.16,
			"2048x2048": 0.16,
		},
	},
}
