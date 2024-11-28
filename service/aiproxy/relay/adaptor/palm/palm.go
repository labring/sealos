package palm

import (
	"net/http"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://developers.generativeai.google/api/rest/generativelanguage/models/generateMessage#request-body
// https://developers.generativeai.google/api/rest/generativelanguage/models/generateMessage#response-body

func ConvertRequest(textRequest *model.GeneralOpenAIRequest) *ChatRequest {
	palmRequest := ChatRequest{
		Prompt: Prompt{
			Messages: make([]ChatMessage, 0, len(textRequest.Messages)),
		},
		Temperature:    textRequest.Temperature,
		CandidateCount: textRequest.N,
		TopP:           textRequest.TopP,
		TopK:           textRequest.MaxTokens,
	}
	for _, message := range textRequest.Messages {
		palmMessage := ChatMessage{
			Content: message.StringContent(),
		}
		if message.Role == "user" {
			palmMessage.Author = "0"
		} else {
			palmMessage.Author = "1"
		}
		palmRequest.Prompt.Messages = append(palmRequest.Prompt.Messages, palmMessage)
	}
	return &palmRequest
}

func responsePaLM2OpenAI(response *ChatResponse) *openai.TextResponse {
	fullTextResponse := openai.TextResponse{
		Choices: make([]*openai.TextResponseChoice, 0, len(response.Candidates)),
	}
	for i, candidate := range response.Candidates {
		choice := openai.TextResponseChoice{
			Index: i,
			Message: model.Message{
				Role:    "assistant",
				Content: candidate.Content,
			},
			FinishReason: "stop",
		}
		fullTextResponse.Choices = append(fullTextResponse.Choices, &choice)
	}
	return &fullTextResponse
}

func streamResponsePaLM2OpenAI(palmResponse *ChatResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	if len(palmResponse.Candidates) > 0 {
		choice.Delta.Content = palmResponse.Candidates[0].Content
	}
	choice.FinishReason = &constant.StopFinishReason
	var response openai.ChatCompletionsStreamResponse
	response.Object = "chat.completion.chunk"
	response.Model = "palm2"
	response.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	return &response
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, string) {
	defer resp.Body.Close()

	responseText := ""
	responseID := "chatcmpl-" + random.GetUUID()
	createdTime := helper.GetTimestamp()

	var palmResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&palmResponse)
	if err != nil {
		logger.Error(c, "error unmarshalling stream response: "+err.Error())
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), ""
	}

	common.SetEventStreamHeaders(c)

	fullTextResponse := streamResponsePaLM2OpenAI(&palmResponse)
	fullTextResponse.ID = responseID
	fullTextResponse.Created = createdTime
	if len(palmResponse.Candidates) > 0 {
		responseText = palmResponse.Candidates[0].Content
	}

	err = render.ObjectData(c, fullTextResponse)
	if err != nil {
		logger.Error(c, "error stream response: "+err.Error())
		return openai.ErrorWrapper(err, "stream_response_failed", http.StatusInternalServerError), ""
	}

	render.Done(c)

	return nil, responseText
}

func Handler(c *gin.Context, resp *http.Response, promptTokens int, modelName string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var palmResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&palmResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if palmResponse.Error.Code != 0 || len(palmResponse.Candidates) == 0 {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: palmResponse.Error.Message,
				Type:    palmResponse.Error.Status,
				Param:   "",
				Code:    palmResponse.Error.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responsePaLM2OpenAI(&palmResponse)
	fullTextResponse.Model = modelName
	completionTokens := openai.CountTokenText(palmResponse.Candidates[0].Content, modelName)
	usage := model.Usage{
		PromptTokens:     promptTokens,
		CompletionTokens: completionTokens,
		TotalTokens:      promptTokens + completionTokens,
	}
	fullTextResponse.Usage = usage
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &usage
}
