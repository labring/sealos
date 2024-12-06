package ollama

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "codellama:7b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "llama2:7b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "llama2:latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "llama3:latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "phi3:latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMicrosoft,
	},
	{
		Model: "qwen:0.5b-chat",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
	{
		Model: "qwen:7b",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
}
