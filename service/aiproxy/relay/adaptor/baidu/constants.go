package baidu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "BLOOMZ-7B",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.004,
		OutputPrice: 0.004,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4800),
		),
	},

	{
		Model:       "Embedding-V1",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
		RPM:         1200,
	},
	{
		Model:       "bge-large-zh",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBAAI,
		InputPrice:  0.0005,
		OutputPrice: 0,
		RPM:         1200,
	},
	{
		Model:       "bge-large-en",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBAAI,
		InputPrice:  0.0005,
		OutputPrice: 0,
		RPM:         1200,
	},
	{
		Model:       "tao-8k",
		Type:        relaymode.Embeddings,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
		RPM:         1200,
	},

	{
		Model:       "bce-reranker-base_v1",
		Type:        relaymode.Rerank,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0005,
		OutputPrice: 0,
		RPM:         1200,
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
