package model

type ResponseFormat struct {
	JSONSchema *JSONSchema `json:"json_schema,omitempty"`
	Type       string      `json:"type,omitempty"`
}

type JSONSchema struct {
	Schema      map[string]interface{} `json:"schema,omitempty"`
	Strict      *bool                  `json:"strict,omitempty"`
	Description string                 `json:"description,omitempty"`
	Name        string                 `json:"name"`
}

type Audio struct {
	Voice  string `json:"voice,omitempty"`
	Format string `json:"format,omitempty"`
}

type StreamOptions struct {
	IncludeUsage bool `json:"include_usage,omitempty"`
}

type GeneralOpenAIRequest struct {
	Prediction          any             `json:"prediction,omitempty"`
	Prompt              any             `json:"prompt,omitempty"`
	Input               any             `json:"input,omitempty"`
	Metadata            any             `json:"metadata,omitempty"`
	Functions           any             `json:"functions,omitempty"`
	LogitBias           any             `json:"logit_bias,omitempty"`
	FunctionCall        any             `json:"function_call,omitempty"`
	ToolChoice          any             `json:"tool_choice,omitempty"`
	Stop                any             `json:"stop,omitempty"`
	MaxCompletionTokens *int            `json:"max_completion_tokens,omitempty"`
	TopLogprobs         *int            `json:"top_logprobs,omitempty"`
	Style               *string         `json:"style,omitempty"`
	Quality             *string         `json:"quality,omitempty"`
	Audio               *Audio          `json:"audio,omitempty"`
	PresencePenalty     *float64        `json:"presence_penalty,omitempty"`
	ResponseFormat      *ResponseFormat `json:"response_format,omitempty"`
	Store               *bool           `json:"store,omitempty"`
	ServiceTier         *string         `json:"service_tier,omitempty"`
	FrequencyPenalty    *float64        `json:"frequency_penalty,omitempty"`
	Logprobs            *bool           `json:"logprobs,omitempty"`
	StreamOptions       *StreamOptions  `json:"stream_options,omitempty"`
	Temperature         *float64        `json:"temperature,omitempty"`
	TopP                *float64        `json:"top_p,omitempty"`
	ParallelTooCalls    *bool           `json:"parallel_tool_calls,omitempty"`
	EncodingFormat      string          `json:"encoding_format,omitempty"`
	Model               string          `json:"model,omitempty"`
	Instruction         string          `json:"instruction,omitempty"`
	User                string          `json:"user,omitempty"`
	Size                string          `json:"size,omitempty"`
	Modalities          []string        `json:"modalities,omitempty"`
	Messages            []*Message      `json:"messages,omitempty"`
	Tools               []*Tool         `json:"tools,omitempty"`
	N                   int             `json:"n,omitempty"`
	Dimensions          int             `json:"dimensions,omitempty"`
	Seed                float64         `json:"seed,omitempty"`
	MaxTokens           int             `json:"max_tokens,omitempty"`
	TopK                int             `json:"top_k,omitempty"`
	NumCtx              int             `json:"num_ctx,omitempty"`
	Stream              bool            `json:"stream,omitempty"`
}

func (r GeneralOpenAIRequest) ParseInput() []string {
	if r.Input == nil {
		return nil
	}
	var input []string
	switch v := r.Input.(type) {
	case string:
		input = []string{v}
	case []any:
		input = make([]string, 0, len(v))
		for _, item := range v {
			if str, ok := item.(string); ok {
				input = append(input, str)
			}
		}
	}
	return input
}

type TextToSpeechRequest struct {
	Model          string  `binding:"required"     json:"model"`
	Input          string  `binding:"required"     json:"input"`
	Voice          string  `binding:"required"     json:"voice"`
	ResponseFormat string  `json:"response_format"`
	Speed          float64 `json:"speed"`
}
