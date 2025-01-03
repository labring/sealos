package stepfun

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "step-1-8k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.005,
		OutputPrice: 0.02,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-1-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.015,
		OutputPrice: 0.07,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-1-128k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.04,
		OutputPrice: 0.2,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(128000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-1-256k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.95,
		OutputPrice: 0.3,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(256000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-1-flash",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.001,
		OutputPrice: 0.004,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-2-16k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.038,
		OutputPrice: 0.12,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(16000),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "step-1v-8k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.005,
		OutputPrice: 0.02,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8000),
			model.WithModelConfigToolChoice(true),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "step-1v-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.015,
		OutputPrice: 0.07,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32000),
			model.WithModelConfigToolChoice(true),
			model.WithModelConfigVision(true),
		),
	},
	{
		Model:       "step-1.5v-mini",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerStepFun,
		InputPrice:  0.008,
		OutputPrice: 0.035,
		RPM:         60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32000),
			model.WithModelConfigToolChoice(true),
			model.WithModelConfigVision(true),
		),
	},

	{
		Model:      "step-tts-mini",
		Type:       relaymode.AudioSpeech,
		Owner:      model.ModelOwnerStepFun,
		InputPrice: 0.09,
		RPM:        60,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxInputTokens(1000),
			model.WithModelConfigSupportFormats([]string{"opus", "wav", "flac", "mp3"}),
			model.WithModelConfigSupportVoices([]string{
				"cixingnansheng", "zhengpaiqingnian", "yuanqinansheng",
				"qingniandaxuesheng", "boyinnansheng", "ruyananshi",
				"shenchennanyin", "qinqienvsheng", "wenrounvsheng",
				"jilingshaonv", "yuanqishaonv", "ruanmengnvsheng",
				"youyanvsheng", "lengyanyujie", "shuangkuaijiejie",
				"wenjingxuejie", "linjiajiejie", "linjiameimei",
				"zhixingjiejie",
			}),
		),
	},

	{
		Model:      "step-asr",
		Type:       relaymode.AudioTranscription,
		Owner:      model.ModelOwnerStepFun,
		InputPrice: 0.09,
		RPM:        60,
	},

	{
		Model:             "step-1x-medium",
		Type:              relaymode.ImagesGenerations,
		Owner:             model.ModelOwnerStepFun,
		RPM:               60,
		ImageMaxBatchSize: 1,
		ImagePrices: map[string]float64{
			"256x256":   0.1,
			"512x512":   0.1,
			"768x768":   0.1,
			"1024x1024": 0.1,
			"1280x800":  0.1,
			"800x1280":  0.1,
		},
	},
}
