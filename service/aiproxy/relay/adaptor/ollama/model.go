package ollama

type Options struct {
	Temperature      *float64 `json:"temperature,omitempty"`
	TopP             *float64 `json:"top_p,omitempty"`
	FrequencyPenalty *float64 `json:"frequency_penalty,omitempty"`
	PresencePenalty  *float64 `json:"presence_penalty,omitempty"`
	Seed             int      `json:"seed,omitempty"`
	TopK             int      `json:"top_k,omitempty"`
	NumPredict       int      `json:"num_predict,omitempty"`
	NumCtx           int      `json:"num_ctx,omitempty"`
}

type Message struct {
	Role    string   `json:"role,omitempty"`
	Content string   `json:"content,omitempty"`
	Images  []string `json:"images,omitempty"`
}

type ChatRequest struct {
	Options  *Options  `json:"options,omitempty"`
	Model    string    `json:"model,omitempty"`
	Messages []Message `json:"messages,omitempty"`
	Stream   bool      `json:"stream"`
	Format   any       `json:"format,omitempty"`
}

type ChatResponse struct {
	Model           string  `json:"model,omitempty"`
	CreatedAt       string  `json:"created_at,omitempty"`
	Response        string  `json:"response,omitempty"`
	Error           string  `json:"error,omitempty"`
	Message         Message `json:"message,omitempty"`
	TotalDuration   int     `json:"total_duration,omitempty"`
	LoadDuration    int     `json:"load_duration,omitempty"`
	PromptEvalCount int     `json:"prompt_eval_count,omitempty"`
	EvalCount       int     `json:"eval_count,omitempty"`
	EvalDuration    int     `json:"eval_duration,omitempty"`
	Done            bool    `json:"done,omitempty"`
}

type EmbeddingRequest struct {
	Options *Options `json:"options,omitempty"`
	Model   string   `json:"model"`
	Input   []string `json:"input"`
}

type EmbeddingResponse struct {
	Error           string      `json:"error,omitempty"`
	Model           string      `json:"model"`
	Embeddings      [][]float64 `json:"embeddings"`
	PromptEvalCount int         `json:"prompt_eval_count,omitempty"`
}
