package cohere

type Request struct {
	P                *float64      `json:"p,omitempty"`
	Temperature      *float64      `json:"temperature,omitempty"`
	PresencePenalty  *float64      `json:"presence_penalty,omitempty"`
	FrequencyPenalty *float64      `json:"frequency_penalty,omitempty"`
	Model            string        `json:"model,omitempty"`
	Message          string        `json:"message"                     required:"true"`
	Preamble         string        `json:"preamble,omitempty"`
	PromptTruncation string        `json:"prompt_truncation,omitempty"`
	ConversationID   string        `json:"conversation_id,omitempty"`
	StopSequences    []string      `json:"stop_sequences,omitempty"`
	Tools            []Tool        `json:"tools,omitempty"`
	ToolResults      []ToolResult  `json:"tool_results,omitempty"`
	Documents        []Document    `json:"documents,omitempty"`
	Connectors       []Connector   `json:"connectors,omitempty"`
	ChatHistory      []ChatMessage `json:"chat_history,omitempty"`
	K                int           `json:"k,omitempty"`
	MaxInputTokens   int           `json:"max_input_tokens,omitempty"`
	Seed             int           `json:"seed,omitempty"`
	MaxTokens        int           `json:"max_tokens,omitempty"`
	Stream           bool          `json:"stream,omitempty"`
}

type ChatMessage struct {
	Role    string `json:"role"    required:"true"`
	Message string `json:"message" required:"true"`
}

type Tool struct {
	ParameterDefinitions map[string]ParameterSpec `json:"parameter_definitions"`
	Name                 string                   `json:"name"                  required:"true"`
	Description          string                   `json:"description"           required:"true"`
}

type ParameterSpec struct {
	Description string `json:"description"`
	Type        string `json:"type"        required:"true"`
	Required    bool   `json:"required"`
}

type ToolResult struct {
	Call    ToolCall                 `json:"call"`
	Outputs []map[string]interface{} `json:"outputs"`
}

type ToolCall struct {
	Parameters map[string]interface{} `json:"parameters" required:"true"`
	Name       string                 `json:"name"       required:"true"`
}

type StreamResponse struct {
	Response      *Response       `json:"response,omitempty"`
	EventType     string          `json:"event_type"`
	GenerationID  string          `json:"generation_id,omitempty"`
	Text          string          `json:"text,omitempty"`
	FinishReason  string          `json:"finish_reason,omitempty"`
	SearchQueries []*SearchQuery  `json:"search_queries,omitempty"`
	SearchResults []*SearchResult `json:"search_results,omitempty"`
	Documents     []*Document     `json:"documents,omitempty"`
	Citations     []*Citation     `json:"citations,omitempty"`
	IsFinished    bool            `json:"is_finished"`
}

type SearchQuery struct {
	Text         string `json:"text"`
	GenerationID string `json:"generation_id"`
}

type SearchResult struct {
	SearchQuery *SearchQuery `json:"search_query"`
	Connector   *Connector   `json:"connector"`
	DocumentIDs []string     `json:"document_ids"`
}

type Connector struct {
	ID string `json:"id"`
}

type Document struct {
	ID        string `json:"id"`
	Snippet   string `json:"snippet"`
	Timestamp string `json:"timestamp"`
	Title     string `json:"title"`
	URL       string `json:"url"`
}

type Citation struct {
	Text        string   `json:"text"`
	DocumentIDs []string `json:"document_ids"`
	Start       int      `json:"start"`
	End         int      `json:"end"`
}

type Response struct {
	FinishReason  *string         `json:"finish_reason"`
	ResponseID    string          `json:"response_id"`
	Text          string          `json:"text"`
	GenerationID  string          `json:"generation_id"`
	Message       string          `json:"message"`
	ChatHistory   []*Message      `json:"chat_history"`
	Citations     []*Citation     `json:"citations"`
	Documents     []*Document     `json:"documents"`
	SearchResults []*SearchResult `json:"search_results"`
	SearchQueries []*SearchQuery  `json:"search_queries"`
	Meta          Meta            `json:"meta"`
}

type Message struct {
	Role    string `json:"role"`
	Message string `json:"message"`
}

type Version struct {
	Version string `json:"version"`
}

type Units struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type ChatEntry struct {
	Role    string `json:"role"`
	Message string `json:"message"`
}

type Meta struct {
	APIVersion  APIVersion  `json:"api_version"`
	BilledUnits BilledUnits `json:"billed_units"`
	Tokens      Usage       `json:"tokens"`
}

type APIVersion struct {
	Version string `json:"version"`
}

type BilledUnits struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}
