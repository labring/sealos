package validator

import (
	"errors"
	"math"

	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func ValidateTextRequest(textRequest *model.GeneralOpenAIRequest, relayMode int) error {
	if textRequest.MaxTokens < 0 || textRequest.MaxTokens > math.MaxInt32/2 {
		return errors.New("max_tokens is invalid")
	}
	if textRequest.Model == "" {
		return errors.New("model is required")
	}
	switch relayMode {
	case relaymode.Completions:
		if textRequest.Prompt == "" {
			return errors.New("field prompt is required")
		}
	case relaymode.ChatCompletions:
		if len(textRequest.Messages) == 0 {
			return errors.New("field messages is required")
		}
	case relaymode.Embeddings:
	case relaymode.Moderations:
		if textRequest.Input == "" {
			return errors.New("field input is required")
		}
	case relaymode.Edits:
		if textRequest.Instruction == "" {
			return errors.New("field instruction is required")
		}
	}
	return nil
}
