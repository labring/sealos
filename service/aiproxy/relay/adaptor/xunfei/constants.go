package xunfei

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "SparkDesk-Lite",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "SparkDesk-Pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "SparkDesk-Pro-128K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "SparkDesk-Max",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "SparkDesk-Max-32k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "SparkDesk-4.0-Ultra",
		Type:  relaymode.ChatCompletions,
	},
}
