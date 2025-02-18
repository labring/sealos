package openai

import (
	"bufio"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/common/splitter"
	"github.com/labring/sealos/service/aiproxy/middleware"
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

	hasReasoningContent := false
	var thinkSplitter *splitter.Splitter
	if meta.ChannelConfig.SplitThink {
		thinkSplitter = splitter.NewThinkSplitter()
	}

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
				continue
			}
			if streamResponse.Usage != nil {
				usage = streamResponse.Usage
			}
			for _, choice := range streamResponse.Choices {
				responseText += choice.Delta.StringContent()
				if choice.Delta.ReasoningContent != "" {
					hasReasoningContent = true
				}
			}
			respMap := make(map[string]any)
			err = json.Unmarshal(conv.StringToBytes(data), &respMap)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			if _, ok := respMap["model"]; ok && meta.OriginModel != "" {
				respMap["model"] = meta.OriginModel
			}
			if meta.ChannelConfig.SplitThink && !hasReasoningContent {
				StreamSplitThink(respMap, thinkSplitter, func(data map[string]any) {
					_ = render.ObjectData(c, data)
				})
				continue
			}
			_ = render.ObjectData(c, respMap)
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
			if streamResponse.Usage != nil {
				usage = streamResponse.Usage
			}
			render.StringData(c, data)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	if usage == nil || (usage.TotalTokens == 0 && responseText != "") {
		usage = ResponseText2Usage(responseText, meta.ActualModel, meta.InputTokens)
	}

	if usage.TotalTokens != 0 && usage.PromptTokens == 0 { // some channels don't return prompt tokens & completion tokens
		usage.PromptTokens = meta.InputTokens
		usage.CompletionTokens = usage.TotalTokens - meta.InputTokens
	}

	return usage, nil
}

// renderCallback maybe reuse data, so don't modify data
func StreamSplitThink(data map[string]any, thinkSplitter *splitter.Splitter, renderCallback func(data map[string]any)) {
	choices, ok := data["choices"].([]any)
	if !ok {
		return
	}
	for _, choice := range choices {
		choiceMap, ok := choice.(map[string]any)
		if !ok {
			renderCallback(data)
			continue
		}
		delta, ok := choiceMap["delta"].(map[string]any)
		if !ok {
			renderCallback(data)
			continue
		}
		content, ok := delta["content"].(string)
		if !ok {
			renderCallback(data)
			continue
		}
		think, remaining := thinkSplitter.Process(conv.StringToBytes(content))
		if len(think) == 0 && len(remaining) == 0 {
			renderCallback(data)
			continue
		}
		if len(think) > 0 {
			delta["content"] = ""
			delta["reasoning_content"] = conv.BytesToString(think)
			renderCallback(data)
		}
		if len(remaining) > 0 {
			delta["content"] = conv.BytesToString(remaining)
			delta["reasoning_content"] = ""
			renderCallback(data)
		}
	}
}

func SplitThink(data map[string]any) {
	choices, ok := data["choices"].([]any)
	if !ok {
		return
	}
	for _, choice := range choices {
		choiceMap, ok := choice.(map[string]any)
		if !ok {
			continue
		}
		delta, ok := choiceMap["delta"].(map[string]any)
		if !ok {
			continue
		}
		content, ok := delta["content"].(string)
		if !ok {
			continue
		}
		think, remaining := splitter.NewThinkSplitter().Process(conv.StringToBytes(content))
		delta["reasoning_content"] = conv.BytesToString(think)
		delta["content"] = conv.BytesToString(remaining)
	}
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
			completionTokens += CountTokenText(choice.Message.StringContent(), meta.ActualModel)
		}
		textResponse.Usage = model.Usage{
			PromptTokens:     meta.InputTokens,
			CompletionTokens: completionTokens,
		}
	}
	textResponse.Usage.TotalTokens = textResponse.Usage.PromptTokens + textResponse.Usage.CompletionTokens

	var respMap map[string]any
	err = json.Unmarshal(responseBody, &respMap)
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	if _, ok := respMap["model"]; ok && meta.OriginModel != "" {
		respMap["model"] = meta.OriginModel
	}

	if meta.ChannelConfig.SplitThink {
		SplitThink(respMap)
	}

	newData, err := stdjson.Marshal(respMap)
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(newData)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &textResponse.Usage, nil
}
