package coze

import (
	"bufio"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/coze/constant/messagetype"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://www.coze.com/open

func stopReasonCoze2OpenAI(reason *string) string {
	if reason == nil {
		return ""
	}
	switch *reason {
	case "end_turn":
		return "stop"
	case "stop_sequence":
		return "stop"
	case "max_tokens":
		return "length"
	default:
		return *reason
	}
}

func ConvertRequest(textRequest *model.GeneralOpenAIRequest) *Request {
	cozeRequest := Request{
		Stream: textRequest.Stream,
		User:   textRequest.User,
		BotID:  strings.TrimPrefix(textRequest.Model, "bot-"),
	}
	for i, message := range textRequest.Messages {
		if i == len(textRequest.Messages)-1 {
			cozeRequest.Query = message.StringContent()
			continue
		}
		cozeMessage := Message{
			Role:    message.Role,
			Content: message.StringContent(),
		}
		cozeRequest.ChatHistory = append(cozeRequest.ChatHistory, cozeMessage)
	}
	return &cozeRequest
}

func StreamResponseCoze2OpenAI(cozeResponse *StreamResponse) (*openai.ChatCompletionsStreamResponse, *Response) {
	var response *Response
	var stopReason string
	var choice openai.ChatCompletionsStreamResponseChoice

	if cozeResponse.Message != nil {
		if cozeResponse.Message.Type != messagetype.Answer {
			return nil, nil
		}
		choice.Delta.Content = cozeResponse.Message.Content
	}
	choice.Delta.Role = "assistant"
	finishReason := stopReasonCoze2OpenAI(&stopReason)
	if finishReason != "null" {
		choice.FinishReason = &finishReason
	}
	var openaiResponse openai.ChatCompletionsStreamResponse
	openaiResponse.Object = "chat.completion.chunk"
	openaiResponse.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	openaiResponse.ID = cozeResponse.ConversationID
	return &openaiResponse, response
}

func ResponseCoze2OpenAI(cozeResponse *Response) *openai.TextResponse {
	var responseText string
	for _, message := range cozeResponse.Messages {
		if message.Type == messagetype.Answer {
			responseText = message.Content
			break
		}
	}
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    "assistant",
			Content: responseText,
			Name:    nil,
		},
		FinishReason: "stop",
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + cozeResponse.ConversationID,
		Model:   "coze-bot",
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Choices: []*openai.TextResponseChoice{&choice},
	}
	return &fullTextResponse
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *string) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	var responseText string
	createdTime := helper.GetTimestamp()
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)
	var modelName string

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < 6 || conv.BytesToString(data[:6]) != "data: " {
			continue
		}
		data = data[6:]

		if conv.BytesToString(data) == "[DONE]" {
			break
		}

		var cozeResponse StreamResponse
		err := json.Unmarshal(data, &cozeResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}

		response, _ := StreamResponseCoze2OpenAI(&cozeResponse)
		if response == nil {
			continue
		}

		for _, choice := range response.Choices {
			responseText += conv.AsString(choice.Delta.Content)
		}
		response.Model = modelName
		response.Created = createdTime

		err = render.ObjectData(c, response)
		if err != nil {
			log.Error("error rendering stream response: " + err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return nil, &responseText
}

func Handler(c *gin.Context, resp *http.Response, _ int, modelName string) (*model.ErrorWithStatusCode, *string) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	var cozeResponse Response
	err := json.NewDecoder(resp.Body).Decode(&cozeResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if cozeResponse.Code != 0 {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: cozeResponse.Msg,
				Code:    cozeResponse.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := ResponseCoze2OpenAI(&cozeResponse)
	fullTextResponse.Model = modelName
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		log.Error("write response body failed: " + err.Error())
	}
	var responseText string
	if len(fullTextResponse.Choices) > 0 {
		responseText = fullTextResponse.Choices[0].Message.StringContent()
	}
	return nil, &responseText
}
