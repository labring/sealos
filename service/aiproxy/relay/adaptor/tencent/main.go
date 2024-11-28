package tencent

import (
	"bufio"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func responseTencent2OpenAI(response *ChatResponse) *openai.TextResponse {
	fullTextResponse := openai.TextResponse{
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Usage: model.Usage{
			PromptTokens:     response.Usage.PromptTokens,
			CompletionTokens: response.Usage.CompletionTokens,
			TotalTokens:      response.Usage.TotalTokens,
		},
	}
	if len(response.Choices) > 0 {
		choice := openai.TextResponseChoice{
			Index: 0,
			Message: model.Message{
				Role:    "assistant",
				Content: response.Choices[0].Messages.Content,
			},
			FinishReason: response.Choices[0].FinishReason,
		}
		fullTextResponse.Choices = append(fullTextResponse.Choices, &choice)
	}
	return &fullTextResponse
}

func streamResponseTencent2OpenAI(tencentResponse *ChatResponse) *openai.ChatCompletionsStreamResponse {
	response := openai.ChatCompletionsStreamResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   "tencent-hunyuan",
	}
	if len(tencentResponse.Choices) > 0 {
		var choice openai.ChatCompletionsStreamResponseChoice
		choice.Delta.Content = tencentResponse.Choices[0].Delta.Content
		if tencentResponse.Choices[0].FinishReason == "stop" {
			choice.FinishReason = &constant.StopFinishReason
		}
		response.Choices = append(response.Choices, &choice)
	}
	return &response
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, string) {
	defer resp.Body.Close()

	var responseText string
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

		var tencentResponse ChatResponse
		err := json.Unmarshal(data, &tencentResponse)
		if err != nil {
			logger.Error(c, "error unmarshalling stream response: "+err.Error())
			continue
		}

		response := streamResponseTencent2OpenAI(&tencentResponse)
		if len(response.Choices) != 0 {
			responseText += conv.AsString(response.Choices[0].Delta.Content)
		}

		err = render.ObjectData(c, response)
		if err != nil {
			logger.Error(c, "error rendering stream response: "+err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		logger.Error(c, "error reading stream: "+err.Error())
	}

	render.Done(c)

	return nil, responseText
}

func Handler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var responseP ChatResponseP
	err := json.NewDecoder(resp.Body).Decode(&responseP)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	if responseP.Response.Error.Code != 0 {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: responseP.Response.Error.Message,
				Code:    responseP.Response.Error.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responseTencent2OpenAI(&responseP.Response)
	fullTextResponse.Model = "hunyuan"
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "write_response_body_failed", http.StatusInternalServerError), nil
	}
	return nil, &fullTextResponse.Usage
}

func ParseConfig(config string) (appID int64, secretID string, secretKey string, err error) {
	parts := strings.Split(config, "|")
	if len(parts) != 3 {
		err = errors.New("invalid tencent config")
		return
	}
	appID, err = strconv.ParseInt(parts[0], 10, 64)
	secretID = parts[1]
	secretKey = parts[2]
	return
}

func sha256hex(s string) string {
	b := sha256.Sum256(conv.StringToBytes(s))
	return hex.EncodeToString(b[:])
}

func hmacSha256(s, key string) string {
	hashed := hmac.New(sha256.New, conv.StringToBytes(key))
	hashed.Write(conv.StringToBytes(s))
	return conv.BytesToString(hashed.Sum(nil))
}

func GetSign(req *model.GeneralOpenAIRequest, adaptor *Adaptor, secID, secKey string) string {
	// build canonical request string
	host := "hunyuan.tencentcloudapi.com"
	httpRequestMethod := "POST"
	canonicalURI := "/"
	canonicalQueryString := ""
	canonicalHeaders := fmt.Sprintf("content-type:%s\nhost:%s\nx-tc-action:%s\n",
		"application/json", host, strings.ToLower(adaptor.Action))
	signedHeaders := "content-type;host;x-tc-action"
	payload, _ := json.Marshal(req)
	hashedRequestPayload := sha256hex(conv.BytesToString(payload))
	canonicalRequest := fmt.Sprintf("%s\n%s\n%s\n%s\n%s\n%s",
		httpRequestMethod,
		canonicalURI,
		canonicalQueryString,
		canonicalHeaders,
		signedHeaders,
		hashedRequestPayload)
	// build string to sign
	algorithm := "TC3-HMAC-SHA256"
	requestTimestamp := strconv.FormatInt(adaptor.Timestamp, 10)
	timestamp, _ := strconv.ParseInt(requestTimestamp, 10, 64)
	t := time.Unix(timestamp, 0).UTC()
	// must be the format 2006-01-02, ref to package time for more info
	date := t.Format("2006-01-02")
	credentialScope := fmt.Sprintf("%s/%s/tc3_request", date, "hunyuan")
	hashedCanonicalRequest := sha256hex(canonicalRequest)
	string2sign := fmt.Sprintf("%s\n%s\n%s\n%s",
		algorithm,
		requestTimestamp,
		credentialScope,
		hashedCanonicalRequest)

	// sign string
	secretDate := hmacSha256(date, "TC3"+secKey)
	secretService := hmacSha256("hunyuan", secretDate)
	secretKey := hmacSha256("tc3_request", secretService)
	signature := hex.EncodeToString(conv.StringToBytes(hmacSha256(string2sign, secretKey)))

	// build authorization
	authorization := fmt.Sprintf("%s Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		algorithm,
		secID,
		credentialScope,
		signedHeaders,
		signature)
	return authorization
}
