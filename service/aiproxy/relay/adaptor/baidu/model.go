package baidu

import (
	"time"

	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type ChatResponse struct {
	Usage  *model.Usage `json:"usage"`
	ID     string       `json:"id"`
	Object string       `json:"object"`
	Result string       `json:"result"`
	Error
	Created          int64 `json:"created"`
	IsTruncated      bool  `json:"is_truncated"`
	NeedClearHistory bool  `json:"need_clear_history"`
}

type ChatStreamResponse struct {
	ChatResponse
	SentenceID int  `json:"sentence_id"`
	IsEnd      bool `json:"is_end"`
}

type EmbeddingRequest struct {
	Input []string `json:"input"`
}

type EmbeddingData struct {
	Object    string    `json:"object"`
	Embedding []float64 `json:"embedding"`
	Index     int       `json:"index"`
}

type EmbeddingResponse struct {
	ID     string          `json:"id"`
	Object string          `json:"object"`
	Data   []EmbeddingData `json:"data"`
	Error
	Usage   model.Usage `json:"usage"`
	Created int64       `json:"created"`
}

type AccessToken struct {
	ExpiresAt        time.Time `json:"-"`
	AccessToken      string    `json:"access_token"`
	Error            string    `json:"error,omitempty"`
	ErrorDescription string    `json:"error_description,omitempty"`
	ExpiresIn        int64     `json:"expires_in,omitempty"`
}
