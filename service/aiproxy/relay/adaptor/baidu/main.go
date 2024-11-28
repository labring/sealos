package baidu

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/flfmc9do2

type TokenResponse struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

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

type Error struct {
	ErrorMsg  string `json:"error_msg"`
	ErrorCode int    `json:"error_code"`
}

var baiduTokenStore sync.Map

func ConvertRequest(request *model.GeneralOpenAIRequest) *ChatRequest {
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
	return &baiduRequest
}

func responseBaidu2OpenAI(response *ChatResponse) *openai.TextResponse {
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    "assistant",
			Content: response.Result,
		},
		FinishReason: "stop",
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

func streamResponseBaidu2OpenAI(baiduResponse *ChatStreamResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = baiduResponse.Result
	if baiduResponse.IsEnd {
		choice.FinishReason = &constant.StopFinishReason
	}
	response := openai.ChatCompletionsStreamResponse{
		ID:      baiduResponse.ID,
		Object:  "chat.completion.chunk",
		Created: baiduResponse.Created,
		Model:   "ernie-bot",
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
		Usage:   baiduResponse.Usage,
	}
	return &response
}

func ConvertEmbeddingRequest(request *model.GeneralOpenAIRequest) *EmbeddingRequest {
	return &EmbeddingRequest{
		Input: request.ParseInput(),
	}
}

func embeddingResponseBaidu2OpenAI(response *EmbeddingResponse) *openai.EmbeddingResponse {
	openAIEmbeddingResponse := openai.EmbeddingResponse{
		Object: "list",
		Data:   make([]*openai.EmbeddingResponseItem, 0, len(response.Data)),
		Model:  "baidu-embedding",
		Usage:  response.Usage,
	}
	for _, item := range response.Data {
		openAIEmbeddingResponse.Data = append(openAIEmbeddingResponse.Data, &openai.EmbeddingResponseItem{
			Object:    item.Object,
			Index:     item.Index,
			Embedding: item.Embedding,
		})
	}
	return &openAIEmbeddingResponse
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

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
			logger.Error(c, "error unmarshalling stream response: "+err.Error())
			continue
		}
		if baiduResponse.Usage != nil {
			usage.TotalTokens = baiduResponse.Usage.TotalTokens
			usage.PromptTokens = baiduResponse.Usage.PromptTokens
			usage.CompletionTokens = baiduResponse.Usage.TotalTokens - baiduResponse.Usage.PromptTokens
		}
		response := streamResponseBaidu2OpenAI(&baiduResponse)
		err = render.ObjectData(c, response)
		if err != nil {
			logger.Error(c, "error rendering stream response: "+err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		logger.Error(c, "error reading stream: "+err.Error())
	}

	render.Done(c)

	return nil, &usage
}

func Handler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var baiduResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&baiduResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if baiduResponse.ErrorMsg != "" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: baiduResponse.ErrorMsg,
				Type:    "baidu_error",
				Param:   "",
				Code:    baiduResponse.ErrorCode,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responseBaidu2OpenAI(&baiduResponse)
	fullTextResponse.Model = "ernie-bot"
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func EmbeddingHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var baiduResponse EmbeddingResponse
	err := json.NewDecoder(resp.Body).Decode(&baiduResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if baiduResponse.ErrorMsg != "" {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: baiduResponse.ErrorMsg,
				Type:    "baidu_error",
				Param:   "",
				Code:    baiduResponse.ErrorCode,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := embeddingResponseBaidu2OpenAI(&baiduResponse)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func GetAccessToken(apiKey string) (string, error) {
	if val, ok := baiduTokenStore.Load(apiKey); ok {
		var accessToken AccessToken
		if accessToken, ok = val.(AccessToken); ok {
			// soon this will expire
			if time.Now().Add(time.Hour).After(accessToken.ExpiresAt) {
				go func() {
					_, _ = getBaiduAccessTokenHelper(apiKey)
				}()
			}
			return accessToken.AccessToken, nil
		}
	}
	accessToken, err := getBaiduAccessTokenHelper(apiKey)
	if err != nil {
		return "", err
	}
	if accessToken == nil {
		return "", errors.New("GetAccessToken return a nil token")
	}
	return accessToken.AccessToken, nil
}

func getBaiduAccessTokenHelper(apiKey string) (*AccessToken, error) {
	parts := strings.Split(apiKey, "|")
	if len(parts) != 2 {
		return nil, errors.New("invalid baidu apikey")
	}
	req, err := http.NewRequestWithContext(context.Background(),
		http.MethodPost,
		fmt.Sprintf("https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=%s&client_secret=%s",
			parts[0], parts[1]),
		nil)
	if err != nil {
		return nil, err
	}
	req.Header.Add("Content-Type", "application/json")
	req.Header.Add("Accept", "application/json")
	res, err := client.ImpatientHTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	var accessToken AccessToken
	err = json.NewDecoder(res.Body).Decode(&accessToken)
	if err != nil {
		return nil, err
	}
	if accessToken.Error != "" {
		return nil, errors.New(accessToken.Error + ": " + accessToken.ErrorDescription)
	}
	if accessToken.AccessToken == "" {
		return nil, errors.New("getBaiduAccessTokenHelper get empty access token")
	}
	accessToken.ExpiresAt = time.Now().Add(time.Duration(accessToken.ExpiresIn) * time.Second)
	baiduTokenStore.Store(apiKey, accessToken)
	return &accessToken, nil
}
