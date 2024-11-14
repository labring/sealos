package xunfei

import (
	"bufio"
	"errors"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://console.xfyun.cn/services/cbm
// https://www.xfyun.cn/doc/spark/HTTP%E8%B0%83%E7%94%A8%E6%96%87%E6%A1%A3.html

func StreamHandler(c *gin.Context, resp *http.Response, promptTokens int, modelName string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	common.SetEventStreamHeaders(c)
	id := helper.GetResponseID(c)
	responseModel := c.GetString(ctxkey.OriginalModel)
	var responseText string

	var usage *model.Usage

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

		if response.Usage != nil {
			usage = response.Usage
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

	if usage == nil {
		usage = openai.ResponseText2Usage(responseText, responseModel, promptTokens)
	}
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

func getXunfeiDomain(modelName string) (string, error) {
	_, s, ok := strings.Cut(modelName, "-")
	if !ok {
		return "", errors.New("invalid model name")
	}
	switch strings.ToLower(s) {
	case "lite":
		return "lite", nil
	case "pro":
		return "generalv3", nil
	case "pro-128k":
		return "pro-128k", nil
	case "max":
		return "generalv3.5", nil
	case "max-32k":
		return "max-32k", nil
	case "4.0-ultra":
		return "4.0Ultra", nil
	}
	return "", errors.New("invalid model name")
}
