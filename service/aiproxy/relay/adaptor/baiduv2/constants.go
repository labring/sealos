package baiduv2

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "ERNIE-4.0-8K-Preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.03,
		OutputPrice: 0.09,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.03,
		OutputPrice: 0.09,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-8K-Latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.03,
		OutputPrice: 0.09,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-Turbo-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-Turbo-8K-Latest",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-Turbo-8K-Preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-4.0-Turbo-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.02,
		OutputPrice: 0.06,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},

	{
		Model:       "ERNIE-3.5-8K-Preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  2048,
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
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-3.5-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0008,
		OutputPrice: 0.002,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},

	{
		Model:       "ERNIE-Speed-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 7168,
			model.ModelConfigMaxInputTokensKey:   7168,
			model.ModelConfigMaxOutputTokensKey:  2048,
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
		Model:       "ERNIE-Speed-Pro-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
		},
	},

	{
		Model:       "ERNIE-Lite-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0001,
		OutputPrice: 0.0001,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-Lite-Pro-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0002,
		OutputPrice: 0.0004,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 126976,
			model.ModelConfigMaxInputTokensKey:   126976,
			model.ModelConfigMaxOutputTokensKey:  4096,
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
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},

	{
		Model:       "ERNIE-Character-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
	{
		Model:       "ERNIE-Character-Fiction-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.0003,
		OutputPrice: 0.0006,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 5120,
			model.ModelConfigMaxInputTokensKey:   5120,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},

	{
		Model:       "ERNIE-Novel-8K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerBaidu,
		InputPrice:  0.04,
		OutputPrice: 0.12,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigMaxContextTokensKey: 6144,
			model.ModelConfigMaxInputTokensKey:   6144,
			model.ModelConfigMaxOutputTokensKey:  2048,
		},
	},
}
