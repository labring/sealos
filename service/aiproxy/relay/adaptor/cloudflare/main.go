package cloudflare

import (
	"bufio"
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertCompletionsRequest(textRequest *model.GeneralOpenAIRequest) *Request {
	p, _ := textRequest.Prompt.(string)
	return &Request{
		Prompt:      p,
		MaxTokens:   textRequest.MaxTokens,
		Stream:      textRequest.Stream,
		Temperature: textRequest.Temperature,
	}
}

func StreamHandler(c *gin.Context, resp *http.Response, promptTokens int, modelName string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)
	id := helper.GetResponseID(c)
	responseModel := c.GetString(ctxkey.OriginalModel)
	var responseText string

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < 6 || conv.BytesToString(data[:6]) != "data: " {
			continue
		}
		data = data[6:]

		if conv.BytesToString(data) == "[DONE]" {
			break
		}

		var response openai.ChatCompletionsStreamResponse
		err := json.Unmarshal(data, &response)
		if err != nil {
			logger.SysErrorf("error unmarshalling stream response: %s, data: %s", err.Error(), conv.BytesToString(data))
			continue
		}
		for _, v := range response.Choices {
			v.Delta.Role = "assistant"
			responseText += v.Delta.StringContent()
		}
		response.Id = id
		response.Model = modelName
		err = render.ObjectData(c, response)
		if err != nil {
			logger.SysError(err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		logger.SysError("error reading stream: " + err.Error())
	}

	render.Done(c)

	usage := openai.ResponseText2Usage(responseText, responseModel, promptTokens)
	return nil, usage
}

func Handler(c *gin.Context, resp *http.Response, promptTokens int, modelName string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var response openai.TextResponse
	err := json.NewDecoder(resp.Body).Decode(&response)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	response.Model = modelName
	var responseText string
	for _, v := range response.Choices {
		responseText += v.Message.Content.(string)
	}
	usage := openai.ResponseText2Usage(responseText, modelName, promptTokens)
	response.Usage = *usage
	response.Id = helper.GetResponseID(c)
	jsonResponse, err := json.Marshal(response)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, usage
}
