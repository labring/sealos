package zhipu

import (
	"time"

	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type Request struct {
	Temperature *float64         `json:"temperature,omitempty"`
	TopP        *float64         `json:"top_p,omitempty"`
	RequestID   string           `json:"request_id,omitempty"`
	Prompt      []*model.Message `json:"prompt"`
	Incremental bool             `json:"incremental,omitempty"`
}

type ResponseData struct {
	TaskID      string           `json:"task_id"`
	RequestID   string           `json:"request_id"`
	TaskStatus  string           `json:"task_status"`
	Choices     []*model.Message `json:"choices"`
	model.Usage `json:"usage"`
}

type Response struct {
	Msg     string       `json:"msg"`
	Data    ResponseData `json:"data"`
	Code    int          `json:"code"`
	Success bool         `json:"success"`
}

type StreamMetaResponse struct {
	RequestID   string `json:"request_id"`
	TaskID      string `json:"task_id"`
	TaskStatus  string `json:"task_status"`
	model.Usage `json:"usage"`
}

type tokenData struct {
	ExpiryTime time.Time
	Token      string
}

type EmbeddingRequest struct {
	Input any    `json:"input"`
	Model string `json:"model"`
}

type EmbeddingResponse struct {
	Model       string          `json:"model"`
	Object      string          `json:"object"`
	Embeddings  []EmbeddingData `json:"data"`
	model.Usage `json:"usage"`
}

type EmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

type ImageRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	UserID string `json:"user_id,omitempty"`
}
