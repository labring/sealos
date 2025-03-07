package model

import (
	"github.com/bytedance/sonic"
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

func (e *Error) IsEmpty() bool {
	return e == nil || (e.Code == nil && e.Message == "" && e.Type == "" && e.Param == "")
}

func (e *Error) JSONOrEmpty() string {
	if e.IsEmpty() {
		return ""
	}
	jsonBuf, err := sonic.Marshal(e)
	if err != nil {
		return ""
	}
	return conv.BytesToString(jsonBuf)
}

type ErrorWithStatusCode struct {
	Error      Error `json:"error,omitempty"`
	StatusCode int   `json:"-"`
}

func (e *ErrorWithStatusCode) JSONOrEmpty() string {
	if e.StatusCode == 0 && e.Error.IsEmpty() {
		return ""
	}
	jsonBuf, err := sonic.MarshalString(e)
	if err != nil {
		return ""
	}
	return jsonBuf
}
