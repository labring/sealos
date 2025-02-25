package anthropic

// https://docs.anthropic.com/claude/reference/messages_post

type Metadata struct {
	UserID string `json:"user_id"`
}

type ImageSource struct {
	Type      string `json:"type"`
	MediaType string `json:"media_type"`
	Data      string `json:"data"`
}

type Content struct {
	Type     string       `json:"type"`
	Text     string       `json:"text,omitempty"`
	Thinking string       `json:"thinking,omitempty"`
	Source   *ImageSource `json:"source,omitempty"`
	// tool_calls
	ID        string `json:"id,omitempty"`
	Name      string `json:"name,omitempty"`
	Input     any    `json:"input,omitempty"`
	Content   string `json:"content,omitempty"`
	ToolUseID string `json:"tool_use_id,omitempty"`
}

type Message struct {
	Role    string    `json:"role"`
	Content []Content `json:"content"`
}

type Tool struct {
	InputSchema InputSchema `json:"input_schema"`
	Name        string      `json:"name"`
	Description string      `json:"description,omitempty"`
}

type InputSchema struct {
	Properties any    `json:"properties,omitempty"`
	Required   any    `json:"required,omitempty"`
	Type       string `json:"type"`
}

type Thinking struct {
	Type         string `json:"type"`
	BudgetTokens int    `json:"budget_tokens,omitempty"`
}

type Request struct {
	ToolChoice    any       `json:"tool_choice,omitempty"`
	Temperature   *float64  `json:"temperature,omitempty"`
	TopP          *float64  `json:"top_p,omitempty"`
	Model         string    `json:"model"`
	System        string    `json:"system,omitempty"`
	Messages      []Message `json:"messages"`
	StopSequences []string  `json:"stop_sequences,omitempty"`
	Tools         []Tool    `json:"tools,omitempty"`
	MaxTokens     int       `json:"max_tokens,omitempty"`
	TopK          int       `json:"top_k,omitempty"`
	Stream        bool      `json:"stream,omitempty"`
	Thinking      *Thinking `json:"thinking,omitempty"`
}

type Usage struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type Error struct {
	Type    string `json:"type"`
	Message string `json:"message"`
}

type Response struct {
	StopReason   *string   `json:"stop_reason"`
	StopSequence *string   `json:"stop_sequence"`
	Error        Error     `json:"error"`
	ID           string    `json:"id"`
	Type         string    `json:"type"`
	Role         string    `json:"role"`
	Model        string    `json:"model"`
	Content      []Content `json:"content"`
	Usage        Usage     `json:"usage"`
}

type Delta struct {
	StopReason   *string `json:"stop_reason"`
	StopSequence *string `json:"stop_sequence"`
	Type         string  `json:"type"`
	Thinking     string  `json:"thinking,omitempty"`
	Text         string  `json:"text"`
	PartialJSON  string  `json:"partial_json,omitempty"`
}

type StreamResponse struct {
	Message      *Response `json:"message"`
	ContentBlock *Content  `json:"content_block"`
	Delta        *Delta    `json:"delta"`
	Usage        *Usage    `json:"usage"`
	Type         string    `json:"type"`
	Index        int       `json:"index"`
}
