package cohere

import (
	"bufio"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

var WebSearchConnector = Connector{ID: "web-search"}

func stopReasonCohere2OpenAI(reason *string) string {
	if reason == nil {
		return ""
	}
	switch *reason {
	case "COMPLETE":
		return constant.StopFinishReason
	default:
		return *reason
	}
}

func ConvertRequest(textRequest *model.GeneralOpenAIRequest) *Request {
	cohereRequest := Request{
		Model:            textRequest.Model,
		Message:          "",
		MaxTokens:        textRequest.MaxTokens,
		Temperature:      textRequest.Temperature,
		P:                textRequest.TopP,
		K:                textRequest.TopK,
		Stream:           textRequest.Stream,
		FrequencyPenalty: textRequest.FrequencyPenalty,
		PresencePenalty:  textRequest.PresencePenalty,
		Seed:             int(textRequest.Seed),
	}
	if cohereRequest.Model == "" {
		cohereRequest.Model = "command-r"
	}
	if strings.HasSuffix(cohereRequest.Model, "-internet") {
		cohereRequest.Model = strings.TrimSuffix(cohereRequest.Model, "-internet")
		cohereRequest.Connectors = append(cohereRequest.Connectors, WebSearchConnector)
	}
	for _, message := range textRequest.Messages {
		if message.Role == "user" {
			cohereRequest.Message = message.Content.(string)
		} else {
			var role string
			switch message.Role {
			case "assistant":
				role = "CHATBOT"
			case "system":
				role = "SYSTEM"
			default:
				role = "USER"
			}
			cohereRequest.ChatHistory = append(cohereRequest.ChatHistory, ChatMessage{
				Role:    role,
				Message: message.Content.(string),
			})
		}
	}
	return &cohereRequest
}

func StreamResponseCohere2OpenAI(cohereResponse *StreamResponse) (*openai.ChatCompletionsStreamResponse, *Response) {
	var response *Response
	var responseText string
	var finishReason string

	switch cohereResponse.EventType {
	case "stream-start":
		return nil, nil
	case "text-generation":
		responseText += cohereResponse.Text
	case "stream-end":
		usage := cohereResponse.Response.Meta.Tokens
		response = &Response{
			Meta: Meta{
				Tokens: Usage{
					InputTokens:  usage.InputTokens,
					OutputTokens: usage.OutputTokens,
				},
			},
		}
		finishReason = *cohereResponse.Response.FinishReason
	default:
		return nil, nil
	}

	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = responseText
	choice.Delta.Role = "assistant"
	if finishReason != "" {
		choice.FinishReason = &finishReason
	}
	var openaiResponse openai.ChatCompletionsStreamResponse
	openaiResponse.Object = "chat.completion.chunk"
	openaiResponse.Choices = []*openai.ChatCompletionsStreamResponseChoice{&choice}
	return &openaiResponse, response
}

func ResponseCohere2OpenAI(cohereResponse *Response) *openai.TextResponse {
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    "assistant",
			Content: cohereResponse.Text,
			Name:    nil,
		},
		FinishReason: stopReasonCohere2OpenAI(cohereResponse.FinishReason),
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + cohereResponse.ResponseID,
		Model:   "model",
		Object:  "chat.completion",
		Created: time.Now().Unix(),
		Choices: []*openai.TextResponseChoice{&choice},
	}
	return &fullTextResponse
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	createdTime := time.Now().Unix()
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)
	var usage model.Usage

	for scanner.Scan() {
		data := scanner.Text()
		data = strings.TrimSuffix(data, "\r")

		var cohereResponse StreamResponse
		err := json.Unmarshal(conv.StringToBytes(data), &cohereResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}

		response, meta := StreamResponseCohere2OpenAI(&cohereResponse)
		if meta != nil {
			usage.PromptTokens += meta.Meta.Tokens.InputTokens
			usage.CompletionTokens += meta.Meta.Tokens.OutputTokens
			continue
		}
		if response == nil {
			continue
		}

		response.ID = fmt.Sprintf("chatcmpl-%d", createdTime)
		response.Model = c.GetString("original_model")
		response.Created = createdTime

		_ = render.ObjectData(c, response)
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return nil, &usage
}

func Handler(c *gin.Context, resp *http.Response, _ int, modelName string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var cohereResponse Response
	err := json.NewDecoder(resp.Body).Decode(&cohereResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if cohereResponse.ResponseID == "" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: cohereResponse.Message,
				Type:    cohereResponse.Message,
				Param:   "",
				Code:    resp.StatusCode,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := ResponseCohere2OpenAI(&cohereResponse)
	fullTextResponse.Model = modelName
	usage := model.Usage{
		PromptTokens:     cohereResponse.Meta.Tokens.InputTokens,
		CompletionTokens: cohereResponse.Meta.Tokens.OutputTokens,
		TotalTokens:      cohereResponse.Meta.Tokens.InputTokens + cohereResponse.Meta.Tokens.OutputTokens,
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
