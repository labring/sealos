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
		Model: "sambert-zhinan-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiqi-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhichu-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhide-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhijia-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiru-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiqian-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhixiang-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiwei-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhihao-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhijing-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiming-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhimo-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhina-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhishu-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhistella-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiting-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhixiao-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiya-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiye-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiying-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiyuan-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhiyue-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhigui-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhishuo-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhimiao-emo-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhimao-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhilun-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhifei-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-zhida-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-camila-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-perla-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-indah-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-clara-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-hanna-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-beth-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-betty-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-cally-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-cindy-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-eva-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-donna-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-brian-v1",
		Type:  relaymode.AudioSpeech,
	},
	{
		Model: "sambert-waan-v1",
		Type:  relaymode.AudioSpeech,
	},

	{
		Model: "gte-rerank",
		Type:  relaymode.Rerank,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 4000,
			model.ModelConfigMaxInputTokensKey:   4000,
		},
	},
}
