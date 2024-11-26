package siliconflow

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://docs.siliconflow.cn/docs/getting-started

var ModelList = []*model.ModelConfigItem{
	{
		Model: "deepseek-ai/deepseek-llm-67b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen1.5-14B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen1.5-7B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen1.5-110B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen1.5-32B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "01-ai/Yi-1.5-6B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "01-ai/Yi-1.5-9B-Chat-16K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "01-ai/Yi-1.5-34B-Chat-16K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "THUDM/chatglm3-6b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "deepseek-ai/DeepSeek-V2-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "THUDM/glm-4-9b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen2-72B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen2-7B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen2-57B-A14B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "deepseek-ai/DeepSeek-Coder-V2-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Qwen/Qwen2-1.5B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "internlm/internlm2_5-7b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "BAAI/bge-large-en-v1.5",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "BAAI/bge-large-zh-v1.5",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "BAAI/bge-reranker-v2-m3",
		Type:  relaymode.Rerank,
	},
	{
		Model: "Pro/Qwen/Qwen2-7B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/Qwen/Qwen2-1.5B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/Qwen/Qwen1.5-7B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/THUDM/glm-4-9b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/THUDM/chatglm3-6b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/01-ai/Yi-1.5-9B-Chat-16K",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/01-ai/Yi-1.5-6B-Chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/google/gemma-2-9b-it",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/internlm/internlm2_5-7b-chat",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/meta-llama/Meta-Llama-3-8B-Instruct",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "Pro/mistralai/Mistral-7B-Instruct-v0.2",
		Type:  relaymode.ChatCompletions,
	},
}
