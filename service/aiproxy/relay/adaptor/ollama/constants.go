package ollama

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "codellama:7b-instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama2:7b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama2:latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama3:latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "phi3:latest",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen:0.5b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "qwen:7b",
		Type:  relaymode.ChatCompletions,
	},
}
