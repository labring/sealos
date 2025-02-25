package openai

import (
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type TextContent struct {
	Type string `json:"type,omitempty"`
	Text string `json:"text,omitempty"`
}

type ImageContent struct {
	ImageURL *model.ImageURL `json:"image_url,omitempty"`
	Type     string          `json:"type,omitempty"`
}

type ChatRequest struct {
	Model     string           `json:"model"`
	Messages  []*model.Message `json:"messages"`
	MaxTokens int              `json:"max_tokens"`
}

type TextRequest struct {
	Model     string           `json:"model"`
	Prompt    string           `json:"prompt"`
	Messages  []*model.Message `json:"messages"`
	MaxTokens int              `json:"max_tokens"`
}

// ImageRequest docs: https://platform.openai.com/docs/api-reference/images/create
type ImageRequest struct {
	Model          string `json:"model"`
	Prompt         string `binding:"required"               json:"prompt"`
	Size           string `json:"size,omitempty"`
	Quality        string `json:"quality,omitempty"`
	ResponseFormat string `json:"response_format,omitempty"`
	Style          string `json:"style,omitempty"`
	User           string `json:"user,omitempty"`
	N              int    `json:"n,omitempty"`
}

type WhisperJSONResponse struct {
	Text string `json:"text,omitempty"`
}

type WhisperVerboseJSONResponse struct {
	Task     string     `json:"task,omitempty"`
	Language string     `json:"language,omitempty"`
	Text     string     `json:"text,omitempty"`
	Segments []*Segment `json:"segments,omitempty"`
	Duration float64    `json:"duration,omitempty"`
}

type Segment struct {
	Text             string  `json:"text"`
	Tokens           []int   `json:"tokens"`
	ID               int     `json:"id"`
	Seek             int     `json:"seek"`
	Start            float64 `json:"start"`
	End              float64 `json:"end"`
	Temperature      float64 `json:"temperature"`
	AvgLogprob       float64 `json:"avg_logprob"`
	CompressionRatio float64 `json:"compression_ratio"`
	NoSpeechProb     float64 `json:"no_speech_prob"`
}

type UsageOrResponseText struct {
	*model.Usage
	ResponseText string
}

type SlimTextResponse struct {
	Error   model.Error           `json:"error"`
	Choices []*TextResponseChoice `json:"choices"`
	Usage   model.Usage           `json:"usage"`
}

type SlimRerankResponse struct {
	Meta model.RerankMeta `json:"meta"`
}

type TextResponseChoice struct {
	FinishReason string        `json:"finish_reason"`
	Message      model.Message `json:"message"`
	Index        int           `json:"index"`
	Text         string        `json:"text"`
}

type TextResponse struct {
	ID          string                `json:"id"`
	Model       string                `json:"model,omitempty"`
	Object      string                `json:"object"`
	Choices     []*TextResponseChoice `json:"choices"`
	model.Usage `json:"usage"`
	Created     int64 `json:"created"`
}

type EmbeddingResponseItem struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

type EmbeddingResponse struct {
	Object      string                   `json:"object"`
	Model       string                   `json:"model"`
	Data        []*EmbeddingResponseItem `json:"data"`
	model.Usage `json:"usage"`
}

type ImageData struct {
	URL           string `json:"url,omitempty"`
	B64Json       string `json:"b64_json,omitempty"`
	RevisedPrompt string `json:"revised_prompt,omitempty"`
}

type ImageResponse struct {
	Data    []*ImageData `json:"data"`
	Created int64        `json:"created"`
}

type ChatCompletionsStreamResponseChoice struct {
	FinishReason *string       `json:"finish_reason,omitempty"`
	Delta        model.Message `json:"delta"`
	Index        int           `json:"index"`
}

type ChatCompletionsStreamResponse struct {
	Usage   *model.Usage                           `json:"usage,omitempty"`
	ID      string                                 `json:"id"`
	Object  string                                 `json:"object"`
	Model   string                                 `json:"model"`
	Choices []*ChatCompletionsStreamResponseChoice `json:"choices"`
	Created int64                                  `json:"created"`
}

type CompletionsStreamResponse struct {
	Choices []*struct {
		Text         string `json:"text"`
		FinishReason string `json:"finish_reason"`
	} `json:"choices"`
	Usage *model.Usage `json:"usage"`
}

type SubscriptionResponse struct {
	Object             string  `json:"object"`
	HasPaymentMethod   bool    `json:"has_payment_method"`
	SoftLimitUSD       float64 `json:"soft_limit_usd"`
	HardLimitUSD       float64 `json:"hard_limit_usd"`
	SystemHardLimitUSD float64 `json:"system_hard_limit_usd"`
	AccessUntil        int64   `json:"access_until"`
}

type UsageResponse struct {
	Object string `json:"object"`
	// DailyCosts []OpenAIUsageDailyCost `json:"daily_costs"`
	TotalUsage float64 `json:"total_usage"` // unit: 0.01 dollar
}

type ErrorResp struct {
	Error model.Error `json:"error"`
}
