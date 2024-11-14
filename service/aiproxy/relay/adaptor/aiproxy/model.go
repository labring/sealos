package aiproxy

type LibraryRequest struct {
	Model     string `json:"model"`
	Query     string `json:"query"`
	LibraryID string `json:"libraryId"`
	Stream    bool   `json:"stream"`
}

type LibraryError struct {
	Message string `json:"message"`
	ErrCode int    `json:"errCode"`
}

type LibraryDocument struct {
	Title string `json:"title"`
	URL   string `json:"url"`
}

type LibraryResponse struct {
	LibraryError
	Answer    string            `json:"answer"`
	Documents []LibraryDocument `json:"documents"`
	Success   bool              `json:"success"`
}

type LibraryStreamResponse struct {
	Content   string            `json:"content"`
	Model     string            `json:"model"`
	Documents []LibraryDocument `json:"documents"`
	Finish    bool              `json:"finish"`
}
