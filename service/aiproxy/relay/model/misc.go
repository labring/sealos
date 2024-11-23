package model

import "fmt"

type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

type Error struct {
	Code    any    `json:"code"`
	Message string `json:"message"`
	Type    string `json:"type"`
	Param   string `json:"param"`
}

func (e *Error) String() string {
	return fmt.Sprintf("code: %v, message: %s, type: %s, param: %s", e.Code, e.Message, e.Type, e.Param)
}

func (e *Error) Error() string {
	return e.String()
}

type ErrorWithStatusCode struct {
	Error
	StatusCode int `json:"status_code"`
}

func (e *ErrorWithStatusCode) String() string {
	return fmt.Sprintf("%s, status_code: %d", e.Error.String(), e.StatusCode)
}
