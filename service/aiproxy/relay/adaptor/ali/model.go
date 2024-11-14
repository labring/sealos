package ali

import (
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type Input struct {
	// Prompt   string       `json:"prompt"`
	Messages []model.Message `json:"messages"`
}

type Parameters struct {
	TopP              *float64     `json:"top_p,omitempty"`
	Temperature       *float64     `json:"temperature,omitempty"`
	ResultFormat      string       `json:"result_format,omitempty"`
	Tools             []model.Tool `json:"tools,omitempty"`
	TopK              int          `json:"top_k,omitempty"`
	Seed              uint64       `json:"seed,omitempty"`
	MaxTokens         int          `json:"max_tokens,omitempty"`
	EnableSearch      bool         `json:"enable_search,omitempty"`
	IncrementalOutput bool         `json:"incremental_output,omitempty"`
}

type ChatRequest struct {
	Model      string     `json:"model"`
	Input      Input      `json:"input"`
	Parameters Parameters `json:"parameters,omitempty"`
}

type ImageRequest struct {
	Input struct {
		Prompt         string `json:"prompt"`
		NegativePrompt string `json:"negative_prompt,omitempty"`
	} `json:"input"`
	Model          string `json:"model"`
	ResponseFormat string `json:"response_format,omitempty"`
	Parameters     struct {
		Size  string `json:"size,omitempty"`
		Steps string `json:"steps,omitempty"`
		Scale string `json:"scale,omitempty"`
		N     int    `json:"n,omitempty"`
	} `json:"parameters,omitempty"`
}

type TaskResponse struct {
	RequestID string `json:"request_id,omitempty"`
	Code      string `json:"code,omitempty"`
	Message   string `json:"message,omitempty"`
	Output    struct {
		TaskID     string `json:"task_id,omitempty"`
		TaskStatus string `json:"task_status,omitempty"`
		Code       string `json:"code,omitempty"`
		Message    string `json:"message,omitempty"`
		Results    []struct {
			B64Image string `json:"b64_image,omitempty"`
			URL      string `json:"url,omitempty"`
			Code     string `json:"code,omitempty"`
			Message  string `json:"message,omitempty"`
		} `json:"results,omitempty"`
		TaskMetrics struct {
			Total     int `json:"TOTAL,omitempty"`
			Succeeded int `json:"SUCCEEDED,omitempty"`
			Failed    int `json:"FAILED,omitempty"`
		} `json:"task_metrics,omitempty"`
	} `json:"output,omitempty"`
	Usage      Usage `json:"usage"`
	StatusCode int   `json:"status_code,omitempty"`
}

type Header struct {
	Attributes   any    `json:"attributes,omitempty"`
	Action       string `json:"action,omitempty"`
	Streaming    string `json:"streaming,omitempty"`
	TaskID       string `json:"task_id,omitempty"`
	Event        string `json:"event,omitempty"`
	ErrorCode    string `json:"error_code,omitempty"`
	ErrorMessage string `json:"error_message,omitempty"`
}

type Payload struct {
	Model     string `json:"model,omitempty"`
	Task      string `json:"task,omitempty"`
	TaskGroup string `json:"task_group,omitempty"`
	Function  string `json:"function,omitempty"`
	Input     struct {
		Text string `json:"text,omitempty"`
	} `json:"input,omitempty"`
	Parameters struct {
		Format     string  `json:"format,omitempty"`
		SampleRate int     `json:"sample_rate,omitempty"`
		Rate       float64 `json:"rate,omitempty"`
	} `json:"parameters,omitempty"`
	Usage struct {
		Characters int `json:"characters,omitempty"`
	} `json:"usage,omitempty"`
}

type WSSMessage struct {
	Header  Header  `json:"header,omitempty"`
	Payload Payload `json:"payload,omitempty"`
}

type EmbeddingRequest struct {
	Parameters *struct {
		TextType string `json:"text_type,omitempty"`
	} `json:"parameters,omitempty"`
	Model string `json:"model"`
	Input struct {
		Texts []string `json:"texts"`
	} `json:"input"`
}

type Embedding struct {
	Embedding []float64 `json:"embedding"`
	TextIndex int       `json:"text_index"`
}

type EmbeddingResponse struct {
	Error
	Output struct {
		Embeddings []Embedding `json:"embeddings"`
	} `json:"output"`
	Usage Usage `json:"usage"`
}

type Error struct {
	Code      string `json:"code"`
	Message   string `json:"message"`
	RequestID string `json:"request_id"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
	TotalTokens  int `json:"total_tokens"`
}

type Output struct {
	// Text         string                      `json:"text"`
	// FinishReason string                      `json:"finish_reason"`
	Choices []openai.TextResponseChoice `json:"choices"`
}

type ChatResponse struct {
	Error
	Output Output `json:"output"`
	Usage  Usage  `json:"usage"`
}
