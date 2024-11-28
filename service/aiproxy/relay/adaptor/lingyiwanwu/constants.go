package lingyiwanwu

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://platform.lingyiwanwu.com/docs

var ModelList = []*model.ModelConfig{
	{
		Model: "yi-34b-chat-0205",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "yi-34b-chat-200k",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "yi-vl-plus",
		Type:  relaymode.ChatCompletions,
	},
}
