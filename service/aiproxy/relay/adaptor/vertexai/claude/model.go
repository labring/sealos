package vertexai

import "github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"

type Request struct {
	ToolChoice       any                 `json:"tool_choice,omitempty"`
	Temperature      *float64            `json:"temperature,omitempty"`
	TopP             *float64            `json:"top_p,omitempty"`
	AnthropicVersion string              `json:"anthropic_version"`
	System           string              `json:"system,omitempty"`
	Messages         []anthropic.Message `json:"messages"`
	StopSequences    []string            `json:"stop_sequences,omitempty"`
	Tools            []anthropic.Tool    `json:"tools,omitempty"`
	MaxTokens        int                 `json:"max_tokens,omitempty"`
	TopK             int                 `json:"top_k,omitempty"`
	Stream           bool                `json:"stream,omitempty"`
}
