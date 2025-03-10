package openai

import (
	"bufio"
	"bytes"
	"errors"
	"io"
	"net/http"
	"slices"
	"strings"
	"sync"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/ast"
	"github.com/gin-gonic/gin"
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

func GetUsageAndChoicesResponseFromNode(node *ast.Node) (*UsageAndChoicesResponse, error) {
	var usage *model.Usage
	usageNode, err := node.Get("usage").Raw()
	if err != nil {
		if !errors.Is(err, ast.ErrNotExist) {
			return nil, err
		}
	} else {
		err = sonic.UnmarshalString(usageNode, &usage)
		if err != nil {
			return nil, err
		}
	}

	var choices []*ChatCompletionsStreamResponseChoice
	choicesNode, err := node.Get("choices").Raw()
	if err != nil {
		if !errors.Is(err, ast.ErrNotExist) {
			return nil, err
		}
	} else {
		err = sonic.UnmarshalString(choicesNode, &choices)
		if err != nil {
			return nil, err
		}
	}
	return &UsageAndChoicesResponse{
		Usage:   usage,
		Choices: choices,
	}, nil
}

func StreamHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	if resp.StatusCode != http.StatusOK {
		return nil, ErrorHanlder(resp)
	}

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
			node, err := sonic.Get(data)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			streamResponse, err := GetUsageAndChoicesResponseFromNode(&node)
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

			_, err = node.Set("model", ast.NewString(meta.OriginModel))
			if err != nil {
				log.Error("error set model: " + err.Error())
			}

			if meta.ChannelConfig.SplitThink && !hasReasoningContent {
				respMap, err := node.Map()
				if err != nil {
					log.Error("error get node map: " + err.Error())
					continue
				}
				StreamSplitThink(respMap, thinkSplitter, func(data map[string]any) {
					_ = render.ObjectData(c, data)
				})
				continue
			}

			_ = render.ObjectData(c, &node)
		case relaymode.Completions:
			node, err := sonic.Get(data)
			if err != nil {
				log.Error("error unmarshalling stream response: " + err.Error())
				continue
			}
			streamResponse, err := GetUsageAndChoicesResponseFromNode(&node)
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
			_, err = node.Set("model", ast.NewString(meta.OriginModel))
			if err != nil {
				log.Error("error set model: " + err.Error())
			}
			_ = render.ObjectData(c, &node)
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
		delta["content"] = ""
		delete(delta, "reasoning_content")
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

func StreamSplitThinkModeld(data *ChatCompletionsStreamResponse, thinkSplitter *splitter.Splitter, renderCallback func(data *ChatCompletionsStreamResponse)) {
	choices := data.Choices
	// only support one choice
	if len(data.Choices) != 1 {
		renderCallback(data)
		return
	}
	choice := choices[0]
	content, ok := choice.Delta.Content.(string)
	if !ok {
		renderCallback(data)
		return
	}
	think, remaining := thinkSplitter.Process(conv.StringToBytes(content))
	if len(think) == 0 && len(remaining) == 0 {
		choice.Delta.Content = ""
		choice.Delta.ReasoningContent = ""
		renderCallback(data)
		return
	}
	if len(think) > 0 {
		choice.Delta.Content = ""
		choice.Delta.ReasoningContent = conv.BytesToString(think)
		renderCallback(data)
	}
	if len(remaining) > 0 {
		choice.Delta.Content = conv.BytesToString(remaining)
		choice.Delta.ReasoningContent = ""
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
		message, ok := choiceMap["message"].(map[string]any)
		if !ok {
			continue
		}
		content, ok := message["content"].(string)
		if !ok {
			continue
		}
		think, remaining := splitter.NewThinkSplitter().Process(conv.StringToBytes(content))
		message["reasoning_content"] = conv.BytesToString(think)
		message["content"] = conv.BytesToString(remaining)
	}
}

func SplitThinkModeld(data *TextResponse) {
	choices := data.Choices
	for _, choice := range choices {
		content, ok := choice.Message.Content.(string)
		if !ok {
			continue
		}
		think, remaining := splitter.NewThinkSplitter().Process(conv.StringToBytes(content))
		choice.Message.ReasoningContent = conv.BytesToString(think)
		choice.Message.Content = conv.BytesToString(remaining)
	}
}

func GetSlimTextResponseFromNode(node *ast.Node) (*SlimTextResponse, error) {
	var e model.Error
	errorNode, err := node.Get("error").Raw()
	if err != nil {
		if !errors.Is(err, ast.ErrNotExist) {
			return nil, err
		}
	} else {
		err = sonic.UnmarshalString(errorNode, &e)
		if err != nil {
			return nil, err
		}
	}
	var choices []*TextResponseChoice
	choicesNode, err := node.Get("choices").Raw()
	if err != nil {
		if !errors.Is(err, ast.ErrNotExist) {
			return nil, err
		}
	} else {
		err = sonic.UnmarshalString(choicesNode, &choices)
		if err != nil {
			return nil, err
		}
	}
	var usage model.Usage
	usageNode, err := node.Get("usage").Raw()
	if err != nil {
		if !errors.Is(err, ast.ErrNotExist) {
			return nil, err
		}
	} else {
		err = sonic.UnmarshalString(usageNode, &usage)
		if err != nil {
			return nil, err
		}
	}
	return &SlimTextResponse{
		Error:   e,
		Choices: choices,
		Usage:   usage,
	}, nil
}

func Handler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	if resp.StatusCode != http.StatusOK {
		return nil, ErrorHanlder(resp)
	}

	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}

	node, err := sonic.Get(responseBody)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	textResponse, err := GetSlimTextResponseFromNode(&node)
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

	_, err = node.Set("model", ast.NewString(meta.OriginModel))
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "set_model_failed", http.StatusInternalServerError)
	}

	if meta.ChannelConfig.SplitThink {
		respMap, err := node.Map()
		if err != nil {
			return &textResponse.Usage, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
		}
		SplitThink(respMap)
	}

	newData, err := sonic.Marshal(&node)
	if err != nil {
		return &textResponse.Usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(newData)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &textResponse.Usage, nil
}
