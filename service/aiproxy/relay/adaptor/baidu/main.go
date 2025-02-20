package baidu

import (
	"bufio"
	"bytes"
	"io"
	"net/http"
	"strconv"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	Temperature     *float64         `json:"temperature,omitempty"`
	TopP            *float64         `json:"top_p,omitempty"`
	PenaltyScore    *float64         `json:"penalty_score,omitempty"`
	System          string           `json:"system,omitempty"`
	UserID          string           `json:"user_id,omitempty"`
	Messages        []*model.Message `json:"messages"`
	MaxOutputTokens int              `json:"max_output_tokens,omitempty"`
	Stream          bool             `json:"stream,omitempty"`
	DisableSearch   bool             `json:"disable_search,omitempty"`
	EnableCitation  bool             `json:"enable_citation,omitempty"`
}

func ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	request, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return "", nil, nil, err
	}
	request.Model = meta.ActualModel
	baiduRequest := ChatRequest{
		Messages:        request.Messages,
		Temperature:     request.Temperature,
		TopP:            request.TopP,
		Stream:          request.Stream,
		DisableSearch:   false,
		EnableCitation:  false,
		MaxOutputTokens: request.MaxTokens,
		UserID:          request.User,
	}
	// Convert frequency penalty to penalty score range [1.0, 2.0]
	if request.FrequencyPenalty != nil {
		penaltyScore := *request.FrequencyPenalty
		if penaltyScore < -2.0 {
			penaltyScore = -2.0
		}
		if penaltyScore > 2.0 {
			penaltyScore = 2.0
		}
		// Map [-2.0, 2.0] to [1.0, 2.0]
		mappedScore := (penaltyScore+2.0)/4.0 + 1.0
		baiduRequest.PenaltyScore = &mappedScore
	}

	for i, message := range request.Messages {
		if message.Role == "system" {
			baiduRequest.System = message.StringContent()
			request.Messages = append(request.Messages[:i], request.Messages[i+1:]...)
			break
		}
	}

	data, err := json.Marshal(baiduRequest)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(data), nil
}

func responseBaidu2OpenAI(response *ChatResponse) *openai.TextResponse {
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    "assistant",
			Content: response.Result,
		},
		FinishReason: constant.StopFinishReason,
	}
	fullTextResponse := openai.TextResponse{
		ID:      response.ID,
		Object:  "chat.completion",
		Created: response.Created,
		Choices: []*openai.TextResponseChoice{&choice},
	}
	if response.Usage != nil {
		fullTextResponse.Usage = *response.Usage
	}
	return &fullTextResponse
}

func streamResponseBaidu2OpenAI(meta *meta.Meta, baiduResponse *ChatStreamResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = baiduResponse.Result
	if baiduResponse.IsEnd {
		choice.FinishReason = &constant.StopFinishReason
	}
	response := openai.ChatCompletionsStreamResponse{
		ID:      baiduResponse.ID,
		Object:  "chat.completion.chunk",
		Created: baiduResponse.Created,
		Model:   meta.OriginModel,
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
		Usage:   baiduResponse.Usage,
	}
	return &response
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	var usage model.Usage
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < 6 || conv.BytesToString(data[:6]) != "data: " {
			continue
		}
		data = data[6:]

		if conv.BytesToString(data) == "[DONE]" {
			break
		}

		var baiduResponse ChatStreamResponse
		err := json.Unmarshal(data, &baiduResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}
		if baiduResponse.Usage != nil {
			usage.TotalTokens = baiduResponse.Usage.TotalTokens
			usage.PromptTokens = baiduResponse.Usage.PromptTokens
			usage.CompletionTokens = baiduResponse.Usage.TotalTokens - baiduResponse.Usage.PromptTokens
		}
		response := streamResponseBaidu2OpenAI(meta, &baiduResponse)
		_ = render.ObjectData(c, response)
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return nil, &usage
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	var baiduResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&baiduResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if baiduResponse.Error != nil && baiduResponse.Error.ErrorCode != 0 {
		return nil, openai.ErrorWrapperWithMessage(baiduResponse.Error.ErrorMsg, "baidu_error_"+strconv.Itoa(baiduResponse.Error.ErrorCode), http.StatusInternalServerError)
	}
	fullTextResponse := responseBaidu2OpenAI(&baiduResponse)
	fullTextResponse.Model = meta.OriginModel
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return &fullTextResponse.Usage, nil
}
