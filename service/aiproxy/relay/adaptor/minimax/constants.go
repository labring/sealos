package minimax

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://www.minimaxi.com/document/guides/chat-model/V2?id=65e0736ab2845de20908e2dd

var ModelList = []*model.ModelConfig{
	{
		Model:       "abab7-chat-preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.01,
		OutputPrice: 0.01,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(245760),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "abab6.5s-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(245760),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "abab6.5g-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "abab6.5t-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "abab5.5s-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.005,
		OutputPrice: 0.005,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "abab5.5-chat",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerMiniMax,
		InputPrice:  0.015,
		OutputPrice: 0.015,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(16384),
			model.WithModelConfigToolChoice(true),
		),
	},

	{
		Model:      "speech-01-turbo",
		Type:       relaymode.AudioSpeech,
		Owner:      model.ModelOwnerMiniMax,
		InputPrice: 0.2,
		RPM:        20,
		Config: model.NewModelConfig(
			model.WithModelConfigSupportFormats([]string{"pcm", "wav", "flac", "mp3"}),
			model.WithModelConfigSupportVoices([]string{
				"male-qn-qingse", "male-qn-jingying", "male-qn-badao", "male-qn-daxuesheng",
				"female-shaonv", "female-yujie", "female-chengshu", "female-tianmei",
				"presenter_male", "presenter_female",
				"audiobook_male_1", "audiobook_male_2", "audiobook_female_1", "audiobook_female_2",
				"male-qn-qingse-jingpin", "male-qn-jingying-jingpin", "male-qn-badao-jingpin", "male-qn-daxuesheng-jingpin",
				"female-shaonv-jingpin", "female-yujie-jingpin", "female-chengshu-jingpin", "female-tianmei-jingpin",
				"clever_boy", "cute_boy", "lovely_girl", "cartoon_pig",
				"bingjiao_didi", "junlang_nanyou", "chunzhen_xuedi", "lengdan_xiongzhang",
				"badao_shaoye", "tianxin_xiaoling", "qiaopi_mengmei", "wumei_yujie",
				"diadia_xuemei", "danya_xuejie",
				"Santa_Claus", "Grinch", "Rudolph", "Arnold",
				"Charming_Santa", "Charming_Lady", "Sweet_Girl", "Cute_Elf",
				"Attractive_Girl", "Serene_Woman",
			}),
		),
	},
}
