package palm

import (
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type ChatMessage struct {
	Author  string `json:"author"`
	Content string `json:"content"`
}

type Filter struct {
	Reason  string `json:"reason"`
	Message string `json:"message"`
}

type Prompt struct {
	Messages []ChatMessage `json:"messages"`
}

type ChatRequest struct {
	Temperature    *float64 `json:"temperature,omitempty"`
	TopP           *float64 `json:"topP,omitempty"`
	Prompt         Prompt   `json:"prompt"`
	CandidateCount int      `json:"candidateCount,omitempty"`
	TopK           int      `json:"topK,omitempty"`
}

type Error struct {
	Message string `json:"message"`
	Status  string `json:"status"`
	Code    int    `json:"code"`
}

type ChatResponse struct {
	Candidates []ChatMessage   `json:"candidates"`
	Messages   []model.Message `json:"messages"`
	Filters    []Filter        `json:"filters"`
	Error      Error           `json:"error"`
}
