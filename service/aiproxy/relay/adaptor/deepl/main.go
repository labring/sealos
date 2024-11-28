package deepl

import (
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/constant/finishreason"
	"github.com/labring/sealos/service/aiproxy/relay/constant/role"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://developers.deepl.com/docs/getting-started/your-first-api-request

func ConvertRequest(textRequest *model.GeneralOpenAIRequest) (*Request, string) {
	var text string
	if len(textRequest.Messages) != 0 {
		text = textRequest.Messages[len(textRequest.Messages)-1].StringContent()
	}
	deeplRequest := Request{
		TargetLang: parseLangFromModelName(textRequest.Model),
		Text:       []string{text},
	}
	return &deeplRequest, text
}

func StreamResponseDeepL2OpenAI(deeplResponse *Response) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	if len(deeplResponse.Translations) != 0 {
		choice.Delta.Content = deeplResponse.Translations[0].Text
	}
	choice.Delta.Role = role.Assistant
	choice.FinishReason = &constant.StopFinishReason
	openaiResponse := openai.ChatCompletionsStreamResponse{
		Object:  constant.StreamObject,
		Created: helper.GetTimestamp(),
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
	}
	return &openaiResponse
}

func ResponseDeepL2OpenAI(deeplResponse *Response) *openai.TextResponse {
	var responseText string
	if len(deeplResponse.Translations) != 0 {
		responseText = deeplResponse.Translations[0].Text
	}
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    role.Assistant,
			Content: responseText,
			Name:    nil,
		},
		FinishReason: finishreason.Stop,
	}
	fullTextResponse := openai.TextResponse{
		Object:  constant.NonStreamObject,
		Created: helper.GetTimestamp(),
		Choices: []*openai.TextResponseChoice{&choice},
	}
	return &fullTextResponse
}

func StreamHandler(c *gin.Context, resp *http.Response, modelName string) *model.ErrorWithStatusCode {
	defer resp.Body.Close()

	var deeplResponse Response
	err := json.NewDecoder(resp.Body).Decode(&deeplResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	fullTextResponse := StreamResponseDeepL2OpenAI(&deeplResponse)
	fullTextResponse.Model = modelName
	fullTextResponse.ID = helper.GetResponseID(c)
	common.SetEventStreamHeaders(c)
	err = render.ObjectData(c, fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "render_response_body_failed", http.StatusInternalServerError)
	}
	render.Done(c)
	return nil
}

func Handler(c *gin.Context, resp *http.Response, modelName string) *model.ErrorWithStatusCode {
	defer resp.Body.Close()

	var deeplResponse Response
	err := json.NewDecoder(resp.Body).Decode(&deeplResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if deeplResponse.Message != "" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: deeplResponse.Message,
				Code:    "deepl_error",
			},
			StatusCode: resp.StatusCode,
		}
	}
	fullTextResponse := ResponseDeepL2OpenAI(&deeplResponse)
	fullTextResponse.Model = modelName
	fullTextResponse.ID = helper.GetResponseID(c)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil
}
