package openai

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/bytedance/sonic"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type GeneralErrorResponse struct {
	Error    model.Error `json:"error"`
	Message  string      `json:"message"`
	Msg      string      `json:"msg"`
	Err      string      `json:"err"`
	ErrorMsg string      `json:"error_msg"`
	Header   struct {
		Message string `json:"message"`
	} `json:"header"`
	Response struct {
		Error struct {
			Message string `json:"message"`
		} `json:"error"`
	} `json:"response"`
}

func (e GeneralErrorResponse) ToMessage() string {
	if e.Error.Message != "" {
		return e.Error.Message
	}
	if e.Message != "" {
		return e.Message
	}
	if e.Msg != "" {
		return e.Msg
	}
	if e.Err != "" {
		return e.Err
	}
	if e.ErrorMsg != "" {
		return e.ErrorMsg
	}
	if e.Header.Message != "" {
		return e.Header.Message
	}
	if e.Response.Error.Message != "" {
		return e.Response.Error.Message
	}
	return ""
}

const (
	ErrorTypeAIProxy     = middleware.ErrorTypeAIPROXY
	ErrorTypeUpstream    = "upstream_error"
	ErrorCodeBadResponse = "bad_response"
)

func ErrorHanlder(resp *http.Response) *model.ErrorWithStatusCode {
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return &model.ErrorWithStatusCode{
			StatusCode: resp.StatusCode,
			Error: model.Error{
				Message: err.Error(),
				Type:    ErrorTypeUpstream,
				Code:    ErrorCodeBadResponse,
			},
		}
	}

	ErrorWithStatusCode := &model.ErrorWithStatusCode{
		StatusCode: resp.StatusCode,
		Error: model.Error{
			Type:  ErrorTypeUpstream,
			Code:  ErrorCodeBadResponse,
			Param: strconv.Itoa(resp.StatusCode),
		},
	}

	var errResponse GeneralErrorResponse
	err = sonic.Unmarshal(respBody, &errResponse)
	if err != nil {
		var errsResp []GeneralErrorResponse
		err = sonic.Unmarshal(respBody, &errsResp)
		if err != nil {
			ErrorWithStatusCode.Error.Message = conv.BytesToString(respBody)
			return ErrorWithStatusCode
		}
		if len(errsResp) > 0 {
			errResponse = errsResp[0]
		}
	}

	if errResponse.Error.Message != "" {
		// OpenAI format error, so we override the default one
		ErrorWithStatusCode.Error = errResponse.Error
	} else {
		ErrorWithStatusCode.Error.Message = errResponse.ToMessage()
	}
	if ErrorWithStatusCode.Error.Message == "" {
		ErrorWithStatusCode.Error.Message = fmt.Sprintf("bad response status code %d", resp.StatusCode)
	}

	if code, ok := ErrorWithStatusCode.Error.Code.(int64); ok && code >= 400 && code < 600 {
		ErrorWithStatusCode.StatusCode = int(code)
	}

	return ErrorWithStatusCode
}
