package utils

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strconv"

	"github.com/labring/sealos/service/aiproxy/model"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type UnsupportedModelTypeError struct {
	ModelType string
}

func (e *UnsupportedModelTypeError) Error() string {
	return fmt.Sprintf("model type '%s' not supported", e.ModelType)
}

func NewErrUnsupportedModelType(modelType string) *UnsupportedModelTypeError {
	return &UnsupportedModelTypeError{ModelType: modelType}
}

func BuildRequest(modelName string) (io.Reader, int, error) {
	modelConfig, ok := model.CacheGetModelConfig(modelName)
	if !ok {
		return nil, relaymode.Unknown, errors.New(modelName + " model config not found")
	}
	switch modelConfig.Type {
	case relaymode.ChatCompletions:
		body, err := BuildChatCompletionRequest(modelName)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.ChatCompletions, nil
	case relaymode.Completions:
		return nil, relaymode.Unknown, NewErrUnsupportedModelType("completions")
	case relaymode.Embeddings:
		body, err := BuildEmbeddingsRequest(modelName)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.Embeddings, nil
	case relaymode.Moderations:
		body, err := BuildModerationsRequest(modelName)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.Moderations, nil
	case relaymode.ImagesGenerations:
		body, err := BuildImagesGenerationsRequest(modelConfig)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.ImagesGenerations, nil
	case relaymode.Edits:
		return nil, relaymode.Unknown, NewErrUnsupportedModelType("edits")
	case relaymode.AudioSpeech:
		body, err := BuildAudioSpeechRequest(modelName)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.AudioSpeech, nil
	case relaymode.AudioTranscription:
		return nil, relaymode.Unknown, NewErrUnsupportedModelType("audio transcription")
	case relaymode.AudioTranslation:
		return nil, relaymode.Unknown, NewErrUnsupportedModelType("audio translation")
	case relaymode.Rerank:
		body, err := BuildRerankRequest(modelName)
		if err != nil {
			return nil, relaymode.Unknown, err
		}
		return body, relaymode.Rerank, nil
	default:
		return nil, relaymode.Unknown, NewErrUnsupportedModelType(strconv.Itoa(modelConfig.Type))
	}
}

func BuildChatCompletionRequest(model string) (io.Reader, error) {
	testRequest := &relaymodel.GeneralOpenAIRequest{
		MaxTokens: 2,
		Model:     model,
		Messages: []*relaymodel.Message{
			{
				Role:    "user",
				Content: "hi",
			},
		},
	}
	jsonBytes, err := json.Marshal(testRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildEmbeddingsRequest(model string) (io.Reader, error) {
	embeddingsRequest := &relaymodel.GeneralOpenAIRequest{
		Model: model,
		Input: "hi",
	}
	jsonBytes, err := json.Marshal(embeddingsRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildModerationsRequest(model string) (io.Reader, error) {
	moderationsRequest := &relaymodel.GeneralOpenAIRequest{
		Model: model,
		Input: "hi",
	}
	jsonBytes, err := json.Marshal(moderationsRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildImagesGenerationsRequest(modelConfig *model.ModelConfig) (io.Reader, error) {
	imagesGenerationsRequest := &relaymodel.GeneralOpenAIRequest{
		Model:  modelConfig.Model,
		Prompt: "hi",
		Size:   "1024x1024",
	}
	for size := range modelConfig.ImagePrices {
		imagesGenerationsRequest.Size = size
		break
	}
	jsonBytes, err := json.Marshal(imagesGenerationsRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildAudioSpeechRequest(model string) (io.Reader, error) {
	audioSpeechRequest := &relaymodel.GeneralOpenAIRequest{
		Model: model,
		Input: "hi",
	}
	jsonBytes, err := json.Marshal(audioSpeechRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildRerankRequest(model string) (io.Reader, error) {
	rerankRequest := &relaymodel.RerankRequest{
		Model:     model,
		Query:     "hi",
		Documents: []string{"hi"},
	}
	jsonBytes, err := json.Marshal(rerankRequest)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(jsonBytes), nil
}

func BuildModeDefaultPath(mode int) string {
	switch mode {
	case relaymode.ChatCompletions:
		return "/v1/chat/completions"
	case relaymode.Completions:
		return "/v1/completions"
	case relaymode.Embeddings:
		return "/v1/embeddings"
	case relaymode.Moderations:
		return "/v1/moderations"
	case relaymode.ImagesGenerations:
		return "/v1/images/generations"
	case relaymode.Edits:
		return "/v1/edits"
	case relaymode.AudioSpeech:
		return "/v1/audio/speech"
	case relaymode.AudioTranscription:
		return "/v1/audio/transcriptions"
	case relaymode.AudioTranslation:
		return "/v1/audio/translations"
	case relaymode.Rerank:
		return "/v1/rerank"
	}
	return ""
}
