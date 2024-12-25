package ali

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://help.aliyun.com/zh/model-studio/getting-started/models?spm=a2c4g.11186623.0.i12#ced16cb6cdfsy

var ModelList = []*model.ModelConfig{
	// 通义千问-Max
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
		Model:       "qwen-max-latest",
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

	// 通义千问-Plus
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
		Model:       "qwen-plus-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  8000,
		},
	},

	// 通义千问-Turbo
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
			model.ModelConfigMaxContextTokensKey: 1000000,
			model.ModelConfigMaxInputTokensKey:   1000000,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},

	// Qwen-Long
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

	// 通义千问VL
	{
		Model:       "qwen-vl-max",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen-vl-max-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen-vl-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8000,
			model.ModelConfigMaxInputTokensKey:   6000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen-vl-plus-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},

	// 通义千问OCR
	{
		Model:       "qwen-vl-ocr",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 34096,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},
	{
		Model:       "qwen-vl-ocr-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 34096,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},

	// 通义千问Math
	{
		Model:       "qwen-math-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen-math-plus-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen-math-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen-math-turbo-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.002,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},

	// 通义千问Coder
	{
		Model:       "qwen-coder-plus",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen-coder-plus-latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
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

	// 通义千问2.5
	{
		Model:       "qwen2.5-72b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen2.5-32b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen2.5-14b-instruct",
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
		Model:       "qwen2.5-7b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},

	// 通义千问2
	{
		Model:       "qwen2-72b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   128000,
			model.ModelConfigMaxOutputTokensKey:  6144,
		},
	},
	{
		Model:       "qwen2-57b-a14b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 65536,
			model.ModelConfigMaxInputTokensKey:   63488,
			model.ModelConfigMaxOutputTokensKey:  6144,
		},
	},
	{
		Model:       "qwen2-7b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   128000,
			model.ModelConfigMaxOutputTokensKey:  6144,
		},
	},

	// 通义千问1.5
	{
		Model:       "qwen1.5-110b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.007,
		OutputPrice: 0.014,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  8000,
		},
	},
	{
		Model:       "qwen1.5-72b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.005,
		OutputPrice: 0.01,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  8000,
		},
	},
	{
		Model:       "qwen1.5-32b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  8000,
		},
	},
	{
		Model:       "qwen1.5-14b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.002,
		OutputPrice: 0.004,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8000,
			model.ModelConfigMaxInputTokensKey:   6000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen1.5-7b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8000,
			model.ModelConfigMaxInputTokensKey:   6000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},

	// 通义千问
	{
		Model:       "qwen-72b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.02,
		OutputPrice: 0.02,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 32000,
			model.ModelConfigMaxInputTokensKey:   30000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen-14b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.008,
		OutputPrice: 0.008,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 8000,
			model.ModelConfigMaxInputTokensKey:   6000,
			model.ModelConfigMaxOutputTokensKey:  2000,
		},
	},
	{
		Model:       "qwen-7b-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.006,
		OutputPrice: 0.006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 7500,
			model.ModelConfigMaxInputTokensKey:   6000,
			model.ModelConfigMaxOutputTokensKey:  1500,
		},
	},

	// 通义千问数学模型
	{
		Model:       "qwen2.5-math-72b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen2.5-math-7b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen2-math-72b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.004,
		OutputPrice: 0.012,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},
	{
		Model:       "qwen2-math-7b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4096,
			model.ModelConfigMaxInputTokensKey:   3072,
			model.ModelConfigMaxOutputTokensKey:  3072,
		},
	},

	// 通义千问Coder
	{
		Model:       "qwen2.5-coder-32b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.0035,
		OutputPrice: 0.007,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},
	{
		Model:       "qwen2.5-coder-14b-instruct",
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
		Model:       "qwen2.5-coder-7b-instruct",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerAlibaba,
		InputPrice:  0.001,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 131072,
			model.ModelConfigMaxInputTokensKey:   129024,
			model.ModelConfigMaxOutputTokensKey:  8192,
		},
	},

	// stable-diffusion
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
