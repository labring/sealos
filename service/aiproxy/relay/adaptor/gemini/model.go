package gemini

type ChatRequest struct {
	GenerationConfig *ChatGenerationConfig `json:"generation_config,omitempty"`
	Contents         []ChatContent         `json:"contents"`
	SafetySettings   []ChatSafetySettings  `json:"safety_settings,omitempty"`
	Tools            []ChatTools           `json:"tools,omitempty"`
}

type EmbeddingRequest struct {
	Model                string      `json:"model"`
	TaskType             string      `json:"taskType,omitempty"`
	Title                string      `json:"title,omitempty"`
	Content              ChatContent `json:"content"`
	OutputDimensionality int         `json:"outputDimensionality,omitempty"`
}

type BatchEmbeddingRequest struct {
	Requests []EmbeddingRequest `json:"requests"`
}

type EmbeddingData struct {
	Values []float64 `json:"values"`
}

type EmbeddingResponse struct {
	Error      *Error          `json:"error,omitempty"`
	Embeddings []EmbeddingData `json:"embeddings"`
}

type Error struct {
	Message string `json:"message,omitempty"`
	Status  string `json:"status,omitempty"`
	Code    int    `json:"code,omitempty"`
}

type InlineData struct {
	MimeType string `json:"mimeType"`
	Data     string `json:"data"`
}

type FunctionCall struct {
	Arguments    any    `json:"args"`
	FunctionName string `json:"name"`
}

type Part struct {
	InlineData   *InlineData   `json:"inlineData,omitempty"`
	FunctionCall *FunctionCall `json:"functionCall,omitempty"`
	Text         string        `json:"text,omitempty"`
}

type ChatContent struct {
	Role  string `json:"role,omitempty"`
	Parts []Part `json:"parts"`
}

type ChatSafetySettings struct {
	Category  string `json:"category"`
	Threshold string `json:"threshold"`
}

type ChatTools struct {
	FunctionDeclarations any `json:"function_declarations,omitempty"`
}

type ChatGenerationConfig struct {
	ResponseSchema   any      `json:"responseSchema,omitempty"`
	Temperature      *float64 `json:"temperature,omitempty"`
	TopP             *float64 `json:"topP,omitempty"`
	ResponseMimeType string   `json:"responseMimeType,omitempty"`
	StopSequences    []string `json:"stopSequences,omitempty"`
	TopK             float64  `json:"topK,omitempty"`
	MaxOutputTokens  int      `json:"maxOutputTokens,omitempty"`
	CandidateCount   int      `json:"candidateCount,omitempty"`
}
