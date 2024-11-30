package model

type RerankRequest struct {
	TopN            *int     `json:"top_n,omitempty"`
	MaxChunksPerDoc *int     `json:"max_chunks_per_doc,omitempty"`
	ReturnDocuments *bool    `json:"return_documents,omitempty"`
	OverlapTokens   *int     `json:"overlap_tokens,omitempty"`
	Model           string   `json:"model"`
	Query           string   `json:"query"`
	Documents       []string `json:"documents"`
}

type Document struct {
	Text string `json:"text"`
}

type RerankResult struct {
	Document       *Document `json:"document,omitempty"`
	Index          int       `json:"index"`
	RelevanceScore float64   `json:"relevance_score"`
}

type RerankMetaTokens struct {
	InputTokens  int `json:"input_tokens"`
	OutputTokens int `json:"output_tokens"`
}

type RerankMeta struct {
	Tokens *RerankMetaTokens `json:"tokens,omitempty"`
	Model  string            `json:"model,omitempty"`
}

type RerankResponse struct {
	Meta   RerankMeta      `json:"meta"`
	ID     string          `json:"id"`
	Result []*RerankResult `json:"result"`
}
