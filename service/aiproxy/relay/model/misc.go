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
	Code    any    `json:"code,omitempty"`
	Message string `json:"message,omitempty"`
	Type    string `json:"type,omitempty"`
	Param   string `json:"param,omitempty"`
}

func (e *Error) String() string {
	jsonBuf, err := json.Marshal(e)
	if err != nil {
		return fmt.Sprintf("code: %v, message: %s, type: %s, param: %s", e.Code, e.Message, e.Type, e.Param)
	}
	return conv.BytesToString(jsonBuf)
}

func (e *Error) Error() string {
	return e.String()
}

type ErrorWithStatusCode struct {
	Error      Error `json:"error"`
	StatusCode int   `json:"-"`
}

func (e *ErrorWithStatusCode) JSON() string {
	jsonBuf, err := json.Marshal(e)
	if err != nil {
		return ""
	}
	return conv.BytesToString(jsonBuf)
}
