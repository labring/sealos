package xunfei

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://www.xfyun.cn/doc/spark/HTTP%E8%B0%83%E7%94%A8%E6%96%87%E6%A1%A3.html#_1-%E6%8E%A5%E5%8F%A3%E8%AF%B4%E6%98%8E

var ModelList = []*model.ModelConfig{
	{
		Model:       "SparkDesk-4.0-Ultra",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.14,
		OutputPrice: 0.14,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "SparkDesk-Lite",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.001,
		OutputPrice: 0.001,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4096),
		),
	},
	{
		Model:       "SparkDesk-Max",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.06,
		OutputPrice: 0.06,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "SparkDesk-Max-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.09,
		OutputPrice: 0.09,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "SparkDesk-Pro",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.014,
		OutputPrice: 0.014,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},
	{
		Model:       "SparkDesk-Pro-128K",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerXunfei,
		InputPrice:  0.026,
		OutputPrice: 0.026,
		RPM:         120,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},
}
