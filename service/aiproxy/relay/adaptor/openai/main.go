package openai

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

const (
	dataPrefix       = "data: "
	done             = "[DONE]"
	dataPrefixLength = len(dataPrefix)
)

var stdjson = json.ConfigCompatibleWithStandardLibrary

type UsageAndChoicesResponse struct {
	Usage   *model.Usage
	Choices []*ChatCompletionsStreamResponseChoice
}

func StreamHandler(c *gin.Context, resp *http.Response, meta *meta.Meta) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	responseText := ""
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	var usage *model.Usage

	common.SetEventStreamHeaders(c)

	for scanner.Scan() {
		data := scanner.Text()
		if len(data) < dataPrefixLength { // ignore blank line or wrong format
			continue
		}
		if data[:dataPrefixLength] != dataPrefix {
			continue
		}
		data = data[dataPrefixLength:]
		if strings.HasPrefix(data, done) {
			break
		}
		switch meta.Mode {
		case relaymode.ChatCompletions:
			var streamResponse UsageAndChoicesResponse
			err := json.Unmarshal(conv.StringToBytes(data), &streamResponse)
			if err != nil {
				logger.Error(c, "error unmarshalling stream response: "+err.Error())
				continue // just ignore the error
			}
			if len(streamResponse.Choices) == 0 && streamResponse.Usage == nil {
				// but for empty choice and no usage, we should not pass it to client, this is for azure
				continue // just ignore empty choice
			}
			if streamResponse.Usage != nil {
				usage = streamResponse.Usage
			}
			for _, choice := range streamResponse.Choices {
				responseText += choice.Delta.StringContent()
			}
			// streamResponse.Model = meta.ActualModelName
			respMap := make(map[string]any)
			err = json.Unmarshal(conv.StringToBytes(data), &respMap)
			if err != nil {
				logger.Error(c, "error unmarshalling stream response: "+err.Error())
				continue
			}
			if _, ok := respMap["model"]; ok && meta.OriginModelName != "" {
				respMap["model"] = meta.OriginModelName
			}
			err = render.ObjectData(c, respMap)
			if err != nil {
				logger.Error(c, "error rendering stream response: "+err.Error())
				continue
			}
		case relaymode.Completions:
			var streamResponse CompletionsStreamResponse
			err := json.Unmarshal(conv.StringToBytes(data), &streamResponse)
			if err != nil {
				logger.Error(c, "error unmarshalling stream response: "+err.Error())
				continue
			}
			for _, choice := range streamResponse.Choices {
				responseText += choice.Text
			}
			render.StringData(c, data)
		}
	}

	if err := scanner.Err(); err != nil {
		logger.Error(c, "error reading stream: "+err.Error())
	}

	render.Done(c)

	if usage == nil || (usage.TotalTokens == 0 && responseText != "") {
		usage = ResponseText2Usage(responseText, meta.ActualModelName, meta.PromptTokens)
	}

	if usage.TotalTokens != 0 && usage.PromptTokens == 0 { // some channels don't return prompt tokens & completion tokens
		usage.PromptTokens = meta.PromptTokens
		usage.CompletionTokens = usage.TotalTokens - meta.PromptTokens
	}

	return nil, usage
}

func Handler(c *gin.Context, resp *http.Response, meta *meta.Meta) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}
	var textResponse SlimTextResponse
	err = json.Unmarshal(responseBody, &textResponse)
	if err != nil {
		return ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if textResponse.Error.Type != "" {
		return &model.ErrorWithStatusCode{
			Error:      textResponse.Error,
			StatusCode: resp.StatusCode,
		}, nil
	}

	if textResponse.Usage.TotalTokens == 0 || (textResponse.Usage.PromptTokens == 0 && textResponse.Usage.CompletionTokens == 0) {
		completionTokens := 0
		for _, choice := range textResponse.Choices {
			completionTokens += CountTokenText(choice.Message.StringContent(), meta.ActualModelName)
		}
		textResponse.Usage = model.Usage{
			PromptTokens:     meta.PromptTokens,
			CompletionTokens: completionTokens,
			TotalTokens:      meta.PromptTokens + completionTokens,
		}
	}

	var respMap map[string]any
	err = json.Unmarshal(responseBody, &respMap)
	if err != nil {
		return ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	if _, ok := respMap["model"]; ok && meta.OriginModelName != "" {
		respMap["model"] = meta.OriginModelName
	}

	newData, err := stdjson.Marshal(respMap)
	if err != nil {
		return ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}

	c.Writer.WriteHeader(resp.StatusCode)

	_, err = c.Writer.Write(newData)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}
	return nil, &textResponse.Usage
}

func RerankHandler(c *gin.Context, resp *http.Response, promptTokens int, _ *meta.Meta) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}
	var rerankResponse SlimRerankResponse
	err = json.Unmarshal(responseBody, &rerankResponse)
	if err != nil {
		return ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	c.Writer.WriteHeader(resp.StatusCode)

	_, err = c.Writer.Write(responseBody)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}

	if rerankResponse.Meta.Tokens == nil {
		return nil, &model.Usage{
			PromptTokens:     promptTokens,
			CompletionTokens: 0,
			TotalTokens:      promptTokens,
		}
	}
	if rerankResponse.Meta.Tokens.InputTokens <= 0 {
		rerankResponse.Meta.Tokens.InputTokens = promptTokens
	}
	return nil, &model.Usage{
		PromptTokens:     rerankResponse.Meta.Tokens.InputTokens,
		CompletionTokens: rerankResponse.Meta.Tokens.OutputTokens,
		TotalTokens:      rerankResponse.Meta.Tokens.InputTokens + rerankResponse.Meta.Tokens.OutputTokens,
	}
}

func TTSHandler(c *gin.Context, resp *http.Response, meta *meta.Meta) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	for k, v := range resp.Header {
		c.Writer.Header().Set(k, v[0])
	}

	_, err := io.Copy(c.Writer, resp.Body)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}
	return nil, &model.Usage{
		PromptTokens:     meta.PromptTokens,
		CompletionTokens: 0,
		TotalTokens:      meta.PromptTokens,
	}
}

func STTHandler(c *gin.Context, resp *http.Response, meta *meta.Meta, responseFormat string) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError), nil
	}

	var openAIErr SlimTextResponse
	if err = json.Unmarshal(responseBody, &openAIErr); err == nil {
		if openAIErr.Error.Message != "" {
			return ErrorWrapper(fmt.Errorf("type %s, code %v, message %s", openAIErr.Error.Type, openAIErr.Error.Code, openAIErr.Error.Message), "request_error", http.StatusInternalServerError), nil
		}
	}

	var text string
	switch responseFormat {
	case "text":
		text = getTextFromText(responseBody)
	case "srt":
		text, err = getTextFromSRT(responseBody)
	case "verbose_json":
		text, err = getTextFromVerboseJSON(responseBody)
	case "vtt":
		text, err = getTextFromVTT(responseBody)
	case "json":
		fallthrough
	default:
		text, err = getTextFromJSON(responseBody)
	}
	if err != nil {
		return ErrorWrapper(err, "get_text_from_body_err", http.StatusInternalServerError), nil
	}
	completionTokens := CountTokenText(text, meta.ActualModelName)

	for k, v := range resp.Header {
		c.Writer.Header().Set(k, v[0])
	}
	_, err = c.Writer.Write(responseBody)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}

	return nil, &model.Usage{
		PromptTokens:     0,
		CompletionTokens: completionTokens,
		TotalTokens:      completionTokens,
	}
}

func getTextFromVTT(body []byte) (string, error) {
	return getTextFromSRT(body)
}

func getTextFromVerboseJSON(body []byte) (string, error) {
	var whisperResponse WhisperVerboseJSONResponse
	if err := json.Unmarshal(body, &whisperResponse); err != nil {
		return "", fmt.Errorf("unmarshal_response_body_failed err :%w", err)
	}
	return whisperResponse.Text, nil
}

func getTextFromSRT(body []byte) (string, error) {
	scanner := bufio.NewScanner(bytes.NewReader(body))
	var builder strings.Builder
	var textLine bool
	for scanner.Scan() {
		line := scanner.Text()
		if textLine {
			builder.WriteString(line)
			textLine = false
			continue
		} else if strings.Contains(line, "-->") {
			textLine = true
			continue
		}
	}
	if err := scanner.Err(); err != nil {
		return "", err
	}
	return builder.String(), nil
}

func getTextFromText(body []byte) string {
	return strings.TrimSuffix(conv.BytesToString(body), "\n")
}

func getTextFromJSON(body []byte) (string, error) {
	var whisperResponse WhisperJSONResponse
	if err := json.Unmarshal(body, &whisperResponse); err != nil {
		return "", fmt.Errorf("unmarshal_response_body_failed err :%w", err)
	}
	return whisperResponse.Text, nil
}
