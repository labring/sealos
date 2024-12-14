package openai

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model:       "gpt-3.5-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.022,
		OutputPrice: 0.044,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(4096),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "gpt-3.5-turbo-16k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.022,
		OutputPrice: 0.044,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(16384),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model: "gpt-3.5-turbo-instruct",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model:       "gpt-4",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.22,
		OutputPrice: 0.44,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(8192),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "gpt-4-32k",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.44,
		OutputPrice: 0.88,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(32768),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "gpt-4-turbo",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.071,
		OutputPrice: 0.213,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model:       "gpt-4o",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.01775,
		OutputPrice: 0.071,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigVision(true),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model: "chatgpt-4o-latest",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model:       "gpt-4o-mini",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.001065,
		OutputPrice: 0.00426,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
			model.WithModelConfigToolChoice(true),
		),
	},
	{
		Model: "gpt-4-vision-preview",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model:       "o1-mini",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.0213,
		OutputPrice: 0.0852,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},
	{
		Model:       "o1-preview",
		Type:        relaymode.ChatCompletions,
		Owner:       model.ModelOwnerOpenAI,
		InputPrice:  0.1065,
		OutputPrice: 0.426,
		Config: model.NewModelConfig(
			model.WithModelConfigMaxContextTokens(131072),
		),
	},

	{
		Model: "text-embedding-ada-002",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-embedding-3-small",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-embedding-3-large",
		Type:  relaymode.Embeddings,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-curie-001",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-babbage-001",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-ada-001",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-davinci-002",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-davinci-003",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-moderation-latest",
		Type:  relaymode.Moderations,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-moderation-stable",
		Type:  relaymode.Moderations,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "text-davinci-edit-001",
		Type:  relaymode.Edits,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "davinci-002",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "babbage-002",
		Type:  relaymode.Completions,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "dall-e-2",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "dall-e-3",
		Type:  relaymode.ImagesGenerations,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "whisper-1",
		Type:  relaymode.AudioTranscription,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "tts-1",
		Type:  relaymode.AudioSpeech,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "tts-1-1106",
		Type:  relaymode.AudioSpeech,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "tts-1-hd",
		Type:  relaymode.AudioSpeech,
		Owner: model.ModelOwnerOpenAI,
	},
	{
		Model: "tts-1-hd-1106",
		Type:  relaymode.AudioSpeech,
		Owner: model.ModelOwnerOpenAI,
	},
}
