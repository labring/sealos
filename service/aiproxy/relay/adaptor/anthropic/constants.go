package anthropic

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "claude-instant-1.2",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-2.0",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-2.1",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-haiku-20240307",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-sonnet-20240229",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-opus-20240229",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-5-sonnet-20240620",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-5-sonnet-20241022",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
	{
		Model: "claude-3-5-sonnet-latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAnthropic,
	},
}
