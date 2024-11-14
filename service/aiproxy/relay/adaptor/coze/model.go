package coze

type Message struct {
	Role        string `json:"role"`
	Type        string `json:"type"`
	Content     string `json:"content"`
	ContentType string `json:"content_type"`
}

type ErrorInformation struct {
	Msg  string `json:"msg"`
	Code int    `json:"code"`
}

type Request struct {
	ConversationID string    `json:"conversation_id,omitempty"`
	BotID          string    `json:"bot_id"`
	User           string    `json:"user"`
	Query          string    `json:"query"`
	ChatHistory    []Message `json:"chat_history,omitempty"`
	Stream         bool      `json:"stream"`
}

type Response struct {
	ConversationID string    `json:"conversation_id,omitempty"`
	Msg            string    `json:"msg,omitempty"`
	Messages       []Message `json:"messages,omitempty"`
	Code           int       `json:"code,omitempty"`
}

type StreamResponse struct {
	Message          *Message          `json:"message,omitempty"`
	ErrorInformation *ErrorInformation `json:"error_information,omitempty"`
	Event            string            `json:"event,omitempty"`
	ConversationID   string            `json:"conversation_id,omitempty"`
	Index            int               `json:"index,omitempty"`
	IsFinish         bool              `json:"is_finish,omitempty"`
}
