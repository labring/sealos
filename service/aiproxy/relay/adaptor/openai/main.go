package openai

import (
	"bufio"
	"bytes"
	"io"
	"net/http"
	"slices"
	"strings"
	"sync"

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
	DataPrefix       = "data:"
	Done             = "[DONE]"
	DataPrefixLength = len(DataPrefix)
)

var (
	DataPrefixBytes = conv.StringToBytes(DataPrefix)
	DoneBytes       = conv.StringToBytes(Done)
)

var stdjson = json.ConfigCompatibleWithStandardLibrary

type UsageAndChoicesResponse struct {
	Usage   *model.Usage
	Choices []*ChatCompletionsStreamResponseChoice
}

const scannerBufferSize = 2 * bufio.MaxScanTokenSize

var scannerBufferPool = sync.Pool{
	New: func() any {
		buf := make([]byte, scannerBufferSize)
		return &buf
	},
}

//nolint:forcetypeassert
func getScannerBuffer() *[]byte {
	return scannerBufferPool.Get().(*[]byte)
}

func putScannerBuffer(buf *[]byte) {
	if cap(*buf) != scannerBufferSize {
		return
	}
	scannerBufferPool.Put(buf)
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseText := strings.Builder{}

	scanner := bufio.NewScanner(resp.Body)
	buf := getScannerBuffer()
	defer putScannerBuffer(buf)
	scanner.Buffer(*buf, cap(*buf))

	var usage *model.Usage

	common.SetEventStreamHeaders(c)

	hasReasoningContent := false
	var thinkSplitter *splitter.Splitter
	if meta.ChannelConfig.SplitThink {
		thinkSplitter = splitter.NewThinkSplitter()
	}

	for scanner.Scan() {
		data := scanner.Bytes()
		if len(data) < DataPrefixLength { // ignore blank line or wrong format
			continue
		}
		if !slices.Equal(data[:DataPrefixLength], DataPrefixBytes) {
			continue
		}
		data = bytes.TrimSpace(data[DataPrefixLength:])
		if slices.Equal(data, DoneBytes) {
			break
		}

		switch meta.Mode {
		case relaymode.ChatCompletions:
			var streamResponse UsageAndChoicesResponse
			err := json.Unmarshal(data, &streamResponse)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			if streamResponse.Usage != nil {
				usage = streamResponse.Usage
				responseText.Reset()
			}
			for _, choice := range streamResponse.Choices {
				if usage == nil {
					responseText.WriteString(choice.Delta.StringContent())
				}
				if choice.Delta.ReasoningContent != "" {
					hasReasoningContent = true
				}
			}
			respMap := make(map[string]any)
			err = json.Unmarshal(data, &respMap)
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
			err := json.Unmarshal(data, &streamResponse)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			if streamResponse.Usage != nil {
				usage = streamResponse.Usage
				responseText.Reset()
			} else {
				for _, choice := range streamResponse.Choices {
					responseText.WriteString(choice.Text)
				}
			}
			respMap := make(map[string]any)
			err = json.Unmarshal(data, &respMap)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			if _, ok := respMap["model"]; ok && meta.OriginModel != "" {
				respMap["model"] = meta.OriginModel
			}
			_ = render.ObjectData(c, respMap)
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	if usage == nil || (usage.TotalTokens == 0 && responseText.Len() > 0) {
		usage = ResponseText2Usage(responseText.String(), meta.ActualModel, meta.InputTokens)
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
	// only support one choice
	if !ok || len(choices) != 1 {
		renderCallback(data)
		return
	}
	choice := choices[0]
	choiceMap, ok := choice.(map[string]any)
	if !ok {
		renderCallback(data)
		return
	}
	delta, ok := choiceMap["delta"].(map[string]any)
	if !ok {
		renderCallback(data)
		return
	}
	content, ok := delta["content"].(string)
	if !ok {
		renderCallback(data)
		return
	}
	think, remaining := thinkSplitter.Process(conv.StringToBytes(content))
	if len(think) == 0 && len(remaining) == 0 {
		renderCallback(data)
		return
	}
	if len(think) > 0 {
		delta["content"] = ""
		delta["reasoning_content"] = conv.BytesToString(think)
		renderCallback(data)
	}
	if len(remaining) > 0 {
		delta["content"] = conv.BytesToString(remaining)
		delete(delta, "reasoning_content")
		renderCallback(data)
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
			if choice.Text != "" {
				completionTokens += CountTokenText(choice.Text, meta.ActualModel)
				continue
			}
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
