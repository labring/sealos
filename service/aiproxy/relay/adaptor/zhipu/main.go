package zhipu

import (
	"bufio"
	"net/http"
	"slices"
	"strings"
	"sync"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://open.bigmodel.cn/doc/api#chatglm_std
// chatglm_std, chatglm_lite
// https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_std/invoke
// https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_std/sse-invoke

var (
	zhipuTokens sync.Map
	expSeconds  int64 = 24 * 3600
)

func GetToken(apikey string) string {
	data, ok := zhipuTokens.Load(apikey)
	if ok {
		td := data.(tokenData)
		if time.Now().Before(td.ExpiryTime) {
			return td.Token
		}
	}

	split := strings.Split(apikey, ".")
	if len(split) != 2 {
		logger.SysError("invalid zhipu key: " + apikey)
		return ""
	}

	id := split[0]
	secret := split[1]

	expMillis := time.Now().Add(time.Duration(expSeconds)*time.Second).UnixNano() / 1e6
	expiryTime := time.Now().Add(time.Duration(expSeconds) * time.Second)

	timestamp := time.Now().UnixNano() / 1e6

	payload := jwt.MapClaims{
		"api_key":   id,
		"exp":       expMillis,
		"timestamp": timestamp,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, payload)

	token.Header["alg"] = "HS256"
	token.Header["sign_type"] = "SIGN"

	tokenString, err := token.SignedString(conv.StringToBytes(secret))
	if err != nil {
		return ""
	}

	zhipuTokens.Store(apikey, tokenData{
		Token:      tokenString,
		ExpiryTime: expiryTime,
	})

	return tokenString
}

func ConvertRequest(request *model.GeneralOpenAIRequest) *Request {
	return &Request{
		Prompt:      request.Messages,
		Temperature: request.Temperature,
		TopP:        request.TopP,
		Incremental: false,
	}
}

func responseZhipu2OpenAI(response *Response) *openai.TextResponse {
	fullTextResponse := openai.TextResponse{
		ID:      response.Data.TaskID,
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Choices: make([]*openai.TextResponseChoice, 0, len(response.Data.Choices)),
		Usage:   response.Data.Usage,
	}
	for i, choice := range response.Data.Choices {
		openaiChoice := openai.TextResponseChoice{
			Index: i,
			Message: model.Message{
				Role:    choice.Role,
				Content: strings.Trim(choice.StringContent(), "\""),
			},
			FinishReason: "",
		}
		if i == len(response.Data.Choices)-1 {
			openaiChoice.FinishReason = "stop"
		}
		fullTextResponse.Choices = append(fullTextResponse.Choices, &openaiChoice)
	}
	return &fullTextResponse
}

func streamResponseZhipu2OpenAI(zhipuResponse string) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = zhipuResponse
	response := openai.ChatCompletionsStreamResponse{
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   "chatglm",
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
	}
	return &response
}

func streamMetaResponseZhipu2OpenAI(zhipuResponse *StreamMetaResponse) (*openai.ChatCompletionsStreamResponse, *model.Usage) {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = ""
	choice.FinishReason = &constant.StopFinishReason
	response := openai.ChatCompletionsStreamResponse{
		ID:      zhipuResponse.RequestID,
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   "chatglm",
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
	}
	return &response, &zhipuResponse.Usage
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var usage *model.Usage
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		if i := strings.Index(conv.BytesToString(data), "\n\n"); i >= 0 && slices.Contains(data, ':') {
			return i + 2, data[0:i], nil
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	})

	common.SetEventStreamHeaders(c)

	for scanner.Scan() {
		data := scanner.Text()
		lines := strings.Split(data, "\n")
		for i, line := range lines {
			if len(line) < 6 {
				continue
			}
			if strings.HasPrefix(line, "data: ") {
				dataSegment := line[6:]
				if i != len(lines)-1 {
					dataSegment += "\n"
				}
				response := streamResponseZhipu2OpenAI(dataSegment)
				err := render.ObjectData(c, response)
				if err != nil {
					logger.Error(c, "error marshalling stream response: "+err.Error())
				}
			} else if strings.HasPrefix(line, "meta: ") {
				metaSegment := line[6:]
				var zhipuResponse StreamMetaResponse
				err := json.Unmarshal(conv.StringToBytes(metaSegment), &zhipuResponse)
				if err != nil {
					logger.Error(c, "error unmarshalling stream response: "+err.Error())
					continue
				}
				response, zhipuUsage := streamMetaResponseZhipu2OpenAI(&zhipuResponse)
				err = render.ObjectData(c, response)
				if err != nil {
					logger.Error(c, "error marshalling stream response: "+err.Error())
				}
				usage = zhipuUsage
			}
		}
	}

	if err := scanner.Err(); err != nil {
		logger.Error(c, "error reading stream: "+err.Error())
	}

	render.Done(c)

	return nil, usage
}

func Handler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var zhipuResponse Response
	err := json.NewDecoder(resp.Body).Decode(&zhipuResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if !zhipuResponse.Success {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: zhipuResponse.Msg,
				Type:    "zhipu_error",
				Param:   "",
				Code:    zhipuResponse.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responseZhipu2OpenAI(&zhipuResponse)
	fullTextResponse.Model = "chatglm"
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func EmbeddingsHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var zhipuResponse EmbeddingResponse
	err := json.NewDecoder(resp.Body).Decode(&zhipuResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	fullTextResponse := embeddingResponseZhipu2OpenAI(&zhipuResponse)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func embeddingResponseZhipu2OpenAI(response *EmbeddingResponse) *openai.EmbeddingResponse {
	openAIEmbeddingResponse := openai.EmbeddingResponse{
		Object: "list",
		Data:   make([]*openai.EmbeddingResponseItem, 0, len(response.Embeddings)),
		Model:  response.Model,
		Usage: model.Usage{
			PromptTokens:     response.PromptTokens,
			CompletionTokens: response.CompletionTokens,
			TotalTokens:      response.Usage.TotalTokens,
		},
	}

	for _, item := range response.Embeddings {
		openAIEmbeddingResponse.Data = append(openAIEmbeddingResponse.Data, &openai.EmbeddingResponseItem{
			Object:    `embedding`,
			Index:     item.Index,
			Embedding: item.Embedding,
		})
	}
	return &openAIEmbeddingResponse
}
