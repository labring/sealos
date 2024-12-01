package cloudflare

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "@cf/meta/llama-3.1-8b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@cf/meta/llama-2-7b-chat-fp16",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@cf/meta/llama-2-7b-chat-int8",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@cf/mistral/mistral-7b-instruct-v0.1",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@hf/thebloke/deepseek-coder-6.7b-base-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
	{
		Model: "@hf/thebloke/deepseek-coder-6.7b-instruct-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
	{
		Model: "@cf/deepseek-ai/deepseek-math-7b-base",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
	{
		Model: "@cf/deepseek-ai/deepseek-math-7b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDeepSeek,
	},
	{
		Model: "@cf/google/gemma-2b-it-lora",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "@hf/google/gemma-7b-it",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "@cf/google/gemma-7b-it-lora",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "@hf/thebloke/llama-2-13b-chat-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@cf/meta-llama/llama-2-7b-chat-hf-lora",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@cf/meta/llama-3-8b-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@hf/thebloke/llamaguard-7b-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@hf/thebloke/mistral-7b-instruct-v0.1-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@hf/mistralai/mistral-7b-instruct-v0.2",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@cf/mistral/mistral-7b-instruct-v0.2-lora",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@hf/thebloke/neural-chat-7b-v3-1-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@cf/openchat/openchat-3.5-0106",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerOpenChat,
	},
	{
		Model: "@hf/thebloke/openhermes-2.5-mistral-7b-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
	{
		Model: "@cf/microsoft/phi-2",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMicrosoft,
	},
	{
		Model: "@cf/qwen/qwen1.5-0.5b-chat",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
	{
		Model: "@cf/qwen/qwen1.5-1.8b-chat",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
	{
		Model: "@cf/qwen/qwen1.5-14b-chat-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
	{
		Model: "@cf/qwen/qwen1.5-7b-chat-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerAlibaba,
	},
	{
		Model: "@cf/defog/sqlcoder-7b-2",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerDefog,
	},
	{
		Model: "@hf/nexusflow/starling-lm-7b-beta",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerNexusFlow,
	},
	{
		Model: "@cf/tinyllama/tinyllama-1.1b-chat-v1.0",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMeta,
	},
	{
		Model: "@hf/thebloke/zephyr-7b-beta-awq",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerMistral,
	},
}
