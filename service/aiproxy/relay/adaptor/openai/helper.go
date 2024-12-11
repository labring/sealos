package openai

import (
	"fmt"
	"strings"

	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ResponseText2Usage(responseText string, modeName string, promptTokens int) *model.Usage {
	usage := &model.Usage{
		PromptTokens:     promptTokens,
		CompletionTokens: CountTokenText(responseText, modeName),
	}
	usage.TotalTokens = usage.PromptTokens + usage.CompletionTokens
	return usage
}

func GetFullRequestURL(baseURL string, requestURL string) string {
	fullRequestURL := fmt.Sprintf("%s%s", baseURL, requestURL)

	if strings.HasPrefix(baseURL, "https://gateway.ai.cloudflare.com") {
		fullRequestURL = fmt.Sprintf("%s%s", baseURL, strings.TrimPrefix(requestURL, "/openai/deployments"))
	}
	return fullRequestURL
}
