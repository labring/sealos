package cloudflare

import (
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertCompletionsRequest(textRequest *model.GeneralOpenAIRequest) *Request {
	p, ok := textRequest.Prompt.(string)
	if !ok && len(textRequest.Messages) > 0 {
		p = textRequest.Messages[0].StringContent()
	}
	return &Request{
		Prompt:      p,
		MaxTokens:   textRequest.MaxTokens,
		Stream:      textRequest.Stream,
		Temperature: textRequest.Temperature,
	}
}
