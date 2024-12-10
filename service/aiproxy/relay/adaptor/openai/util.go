package openai

import (
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func ErrorWrapper(err error, code any, statusCode int) *relaymodel.ErrorWithStatusCode {
	return &relaymodel.ErrorWithStatusCode{
		Error: relaymodel.Error{
			Message: err.Error(),
			Type:    middleware.ErrorTypeAIPROXY,
			Code:    code,
		},
		StatusCode: statusCode,
	}
}

func ErrorWrapperWithMessage(message string, code any, statusCode int) *relaymodel.ErrorWithStatusCode {
	return &relaymodel.ErrorWithStatusCode{
		Error: relaymodel.Error{
			Message: message,
			Type:    middleware.ErrorTypeAIPROXY,
			Code:    code,
		},
		StatusCode: statusCode,
	}
}

func GetPromptTokens(meta *meta.Meta, textRequest *relaymodel.GeneralOpenAIRequest) int {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		return CountTokenMessages(textRequest.Messages, textRequest.Model)
	case relaymode.Completions:
		return CountTokenInput(textRequest.Prompt, textRequest.Model)
	case relaymode.Moderations:
		return CountTokenInput(textRequest.Input, textRequest.Model)
	}
	return 0
}
