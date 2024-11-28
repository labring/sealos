package groq

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://console.groq.com/docs/models

var ModelList = []*model.ModelConfig{
	{
		Model: "gemma-7b-it",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemma2-9b-it",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.1-70b-versatile",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.1-8b-instant",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-11b-text-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-11b-vision-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-1b-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-3b-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-11b-vision-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-90b-text-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-3.2-90b-vision-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama-guard-3-8b",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama3-70b-8192",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama3-8b-8192",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama3-groq-70b-8192-tool-use-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llama3-groq-8b-8192-tool-use-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "llava-v1.5-7b-4096-preview",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "mixtral-8x7b-32768",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "distil-whisper-large-v3-en",
		Type:  relaymode.AudioTranscription,
	},
	{
		Model: "whisper-large-v3",
		Type:  relaymode.AudioTranscription,
	},
	{
		Model: "whisper-large-v3-turbo",
		Type:  relaymode.AudioTranscription,
	},
}
