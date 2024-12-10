package ali

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "qwen-vl-max",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxInputTokensKey:   30720,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "qwen-vl-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8192,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "qwen-coder-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-coder-turbo-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-max",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32768,
			model.ModelConfigMaxInputTokensKey:   30720,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-turbo-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 10000000,
			model.ModelConfigMaxInputTokensKey:   10000000,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-long",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0005,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 10000000,
			model.ModelConfigMaxInputTokensKey:   10000000,
			model.ModelConfigMaxOutputTokensKey:  6000,
		},
	},

	{
		Model: "stable-diffusion-xl",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
	},
	{
		Model: "stable-diffusion-v1.5",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
	},
	{
		Model: "stable-diffusion-3.5-large",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
	},
	{
		Model: "stable-diffusion-3.5-large-turbo",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
	},
	{
		Model:      "sambert-v1",
		Type:       relaymode.AudioSpeech,
		Owner:      model.ModelOwnerAlibaba,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
			model.ModelConfigSupportVoicesKey: []string{
				"zhinan",
				"zhiqi",
				"zhichu",
				"zhide",
				"zhijia",
				"zhiru",
				"zhiqian",
				"zhixiang",
				"zhiwei",
				"zhihao",
				"zhijing",
				"zhiming",
				"zhimo",
				"zhina",
				"zhishu",
				"zhistella",
				"zhiting",
				"zhixiao",
				"zhiya",
				"zhiye",
				"zhiying",
				"zhiyuan",
				"zhiyue",
				"zhigui",
				"zhishuo",
				"zhimiao-emo",
				"zhimao",
				"zhilun",
				"zhifei",
				"zhida",
				"indah",
				"clara",
				"hanna",
				"beth",
				"betty",
				"cally",
				"cindy",
				"eva",
				"donna",
				"brian",
				"waan",
			},
		},
	},

	{
		Model: "paraformer-realtime-v2",
		Type:  relaymode.AudioTranscription,
		Owner: model.ModelOwnerAlibaba,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"pcm", "wav", "opus", "speex", "aac", "amr"},
		},
	},

	{
		Model: "gte-rerank",
		Type:  relaymode.Rerank,
		Owner: model.ModelOwnerAlibaba,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
			model.ModelConfigMaxInputTokensKey:   4000,
		},
	},

	{
		Model:      "text-embedding-v1",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerAlibaba,
		InputPrice: 0.0007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 2048,
		},
	},
	{
		Model:      "text-embedding-v2",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerAlibaba,
		InputPrice: 0.0007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 2048,
		},
	},
	{
		Model:      "text-embedding-v3",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerAlibaba,
		InputPrice: 0.0007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
}
