package model

import (
	"fmt"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
)

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
	Error      Error `json:"error"`
	StatusCode int   `json:"-"`
}

func (e *ErrorWithStatusCode) String() string {
	return fmt.Sprintf("%s, status_code: %d", e.Error.String(), e.StatusCode)
}

func (e *ErrorWithStatusCode) JSON() string {
	json, err := json.Marshal(e)
	if err != nil {
		return ""
	}
	return conv.BytesToString(json)
}
