package ali

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "qwen-vl-max",
		Type:        relaymode.ChatCompletions,
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
	},
	{
		Model: "stable-diffusion-v1.5",
		Type:  relaymode.ImagesGenerations,
	},
	{
		Model: "stable-diffusion-3.5-large",
		Type:  relaymode.ImagesGenerations,
	},
	{
		Model: "stable-diffusion-3.5-large-turbo",
		Type:  relaymode.ImagesGenerations,
	},

	{
		Model:      "sambert-zhinan-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiqi-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhichu-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhide-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhijia-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiru-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiqian-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhixiang-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiwei-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhihao-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhijing-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiming-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhimo-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhina-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhishu-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhistella-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiting-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhixiao-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiya-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiye-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiying-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiyuan-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhiyue-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhigui-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhishuo-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhimiao-emo-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhimao-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhilun-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhifei-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-zhida-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-camila-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-perla-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-indah-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-clara-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-hanna-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-beth-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-betty-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-cally-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-cindy-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-eva-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-donna-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-brian-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},
	{
		Model:      "sambert-waan-v1",
		Type:       relaymode.AudioSpeech,
		InputPrice: 0.1,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 10000,
			model.ModelConfigSupportFormatsKey: []string{"mp3", "wav", "pcm"},
		},
	},

	{
		Model: "gte-rerank",
		Type:  relaymode.Rerank,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
			model.ModelConfigMaxInputTokensKey:   4000,
		},
	},

	{
		Model: "text-embedding-v1",
		Type:  relaymode.Embeddings,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 2048,
		},
	},
	{
		Model: "text-embedding-v2",
		Type:  relaymode.Embeddings,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 2048,
		},
	},
	{
		Model: "text-embedding-v3",
		Type:  relaymode.Embeddings,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxInputTokensKey: 8192,
		},
	},
}
