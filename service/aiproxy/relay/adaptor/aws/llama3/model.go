package aws

// Request is the request to AWS Llama3
//
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-meta.html
type Request struct {
	Temperature *float64 `json:"temperature,omitempty"`
	TopP        *float64 `json:"top_p,omitempty"`
	Prompt      string   `json:"prompt"`
	MaxGenLen   int      `json:"max_gen_len,omitempty"`
}

// Response is the response from AWS Llama3
//
// https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-meta.html
type Response struct {
	Generation           string `json:"generation"`
	StopReason           string `json:"stop_reason"`
	PromptTokenCount     int    `json:"prompt_token_count"`
	GenerationTokenCount int    `json:"generation_token_count"`
}

// {'generation': 'Hi', 'prompt_token_count': 15, 'generation_token_count': 1, 'stop_reason': None}
type StreamResponse struct {
	Generation           string `json:"generation"`
	StopReason           string `json:"stop_reason"`
	PromptTokenCount     int    `json:"prompt_token_count"`
	GenerationTokenCount int    `json:"generation_token_count"`
}
