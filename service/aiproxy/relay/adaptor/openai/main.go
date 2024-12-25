package openai

import (
	"bufio"
	"io"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"

	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

const (
	DataPrefix       = "data: "
	Done             = "[DONE]"
	DataPrefixLength = len(DataPrefix)
)

var stdjson = json.ConfigCompatibleWithStandardLibrary

type UsageAndChoicesResponse struct {
	Usage   *model.Usage
	Choices []*ChatCompletionsStreamResponseChoice
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseText := ""
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(bufio.ScanLines)

	var usage *model.Usage

	common.SetEventStreamHeaders(c)

	for scanner.Scan() {
		data := scanner.Text()
		if len(data) < DataPrefixLength { // ignore blank line or wrong format
			continue
		}
		if data[:DataPrefixLength] != DataPrefix {
			continue
		}
		data = data[DataPrefixLength:]
		if strings.HasPrefix(data, Done) {
			break
		}
		switch meta.Mode {
		case relaymode.ChatCompletions:
			var streamResponse UsageAndChoicesResponse
			err := json.Unmarshal(conv.StringToBytes(data), &streamResponse)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
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
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			if _, ok := respMap["model"]; ok && meta.OriginModelName != "" {
				respMap["model"] = meta.OriginModelName
			}
			err = render.ObjectData(c, respMap)
			if err != nil {
				log.Error("error rendering stream response: " + err.Error())
				continue
			}
		case relaymode.Completions:
			var streamResponse CompletionsStreamResponse
			err := json.Unmarshal(conv.StringToBytes(data), &streamResponse)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			for _, choice := range streamResponse.Choices {
				responseText += choice.Text
			}
			render.StringData(c, data)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	if usage == nil || (usage.TotalTokens == 0 && responseText != "") {
		usage = ResponseText2Usage(responseText, meta.ActualModelName, meta.PromptTokens)
	}

	if usage.TotalTokens != 0 && usage.PromptTokens == 0 { // some channels don't return prompt tokens & completion tokens
		usage.PromptTokens = meta.PromptTokens
		usage.CompletionTokens = usage.TotalTokens - meta.PromptTokens
	}

	return usage, nil
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var textResponse SlimTextResponse
	err = json.Unmarshal(responseBody, &textResponse)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if textResponse.Error.Type != "" {
		return nil, ErrorWrapperWithMessage(textResponse.Error.Message, textResponse.Error.Code, http.StatusBadRequest)
	}

	if textResponse.Usage.TotalTokens == 0 || (textResponse.Usage.PromptTokens == 0 && textResponse.Usage.CompletionTokens == 0) {
		completionTokens := 0
		for _, choice := range textResponse.Choices {
			completionTokens += CountTokenText(choice.Message.StringContent(), meta.ActualModelName)
		}
		textResponse.Usage = model.Usage{
			PromptTokens:     meta.PromptTokens,
			CompletionTokens: completionTokens,
		}
	}
	textResponse.Usage.TotalTokens = textResponse.Usage.PromptTokens + textResponse.Usage.CompletionTokens

	var respMap map[string]any
	err = json.Unmarshal(responseBody, &respMap)
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	if _, ok := respMap["model"]; ok && meta.OriginModelName != "" {
		respMap["model"] = meta.OriginModelName
	}

	newData, err := stdjson.Marshal(respMap)
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(newData)
	if err != nil {
		log.Error("write response body failed: " + err.Error())
	}
	return &textResponse.Usage, nil
}
