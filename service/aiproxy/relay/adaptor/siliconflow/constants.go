package siliconflow

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://docs.siliconflow.cn/docs/getting-started

var ModelList = []*model.ModelConfig{
	{
		Model:       "BAAI/bge-reranker-v2-m3",
		Type:        relaymode.Rerank,
		Owner:       model.ModelOwnerBAAI,
		InputPrice:  0.0009,
		OutputPrice: 0,
		RPM:         2000,
	},

	{
		Model:      "BAAI/bge-large-zh-v1.5",
		Type:       relaymode.Embeddings,
		Owner:      model.ModelOwnerBAAI,
		InputPrice: 0.0005,
		RPM:        2000,
	},

	{
		Model:       "fishaudio/fish-speech-1.4",
		Type:        relaymode.AudioSpeech,
		Owner:       model.ModelOwnerFishAudio,
		OutputPrice: 0.105,
		Config: map[model.ModelConfigKey]any{
			model.ModelConfigSupportVoicesKey: []string{
				"fishaudio/fish-speech-1.4:alex",
				"fishaudio/fish-speech-1.4:benjamin",
				"fishaudio/fish-speech-1.4:charles",
				"fishaudio/fish-speech-1.4:david",
				"fishaudio/fish-speech-1.4:anna",
				"fishaudio/fish-speech-1.4:bella",
				"fishaudio/fish-speech-1.4:claire",
				"fishaudio/fish-speech-1.4:diana",
			},
		},
	},

	{
		Model: "FunAudioLLM/SenseVoiceSmall",
		Type:  relaymode.AudioTranscription,
		Owner: model.ModelOwnerFunAudioLLM,
	},

	{
		Model: "stabilityai/stable-diffusion-3-5-large",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
		ImagePrices: map[string]float64{
			"1024x1024": 0,
			"512x1024":  0,
			"768x512":   0,
			"768x1024":  0,
			"1024x576":  0,
			"576x1024":  0,
		},
	},
	{
		Model: "stabilityai/stable-diffusion-3-5-large-turbo",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerStabilityAI,
		ImagePrices: map[string]float64{
			"1024x1024": 0,
			"512x1024":  0,
			"768x512":   0,
			"768x1024":  0,
			"1024x576":  0,
			"576x1024":  0,
		},
	},
}
