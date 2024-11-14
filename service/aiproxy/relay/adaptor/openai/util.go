package openai

import "github.com/labring/sealos/service/aiproxy/relay/model"

func ErrorWrapper(err error, code string, statusCode int) *model.ErrorWithStatusCode {
	Error := model.Error{
		Message: err.Error(),
		Type:    "aiproxy_error",
		Code:    code,
	}
	return &model.ErrorWithStatusCode{
		Error:      Error,
		StatusCode: statusCode,
	}
}
