package aiproxy

import (
	"bufio"
	"fmt"
	"net/http"
	"slices"
	"strconv"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/common/random"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://docs.aiproxy.io/dev/library#使用已经定制好的知识库进行对话问答

func ConvertRequest(request *model.GeneralOpenAIRequest) *LibraryRequest {
	query := ""
	if len(request.Messages) != 0 {
		query = request.Messages[len(request.Messages)-1].StringContent()
	}
	return &LibraryRequest{
		Model:  request.Model,
		Stream: request.Stream,
		Query:  query,
	}
}

func aiProxyDocuments2Markdown(documents []LibraryDocument) string {
	if len(documents) == 0 {
		return ""
	}
	content := "\n\n参考文档：\n"
	for i, document := range documents {
		content += fmt.Sprintf("%d. [%s](%s)\n", i+1, document.Title, document.URL)
	}
	return content
}

func responseAIProxyLibrary2OpenAI(response *LibraryResponse) *openai.TextResponse {
	content := response.Answer + aiProxyDocuments2Markdown(response.Documents)
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: model.Message{
			Role:    "assistant",
			Content: content,
		},
		FinishReason: "stop",
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Choices: []openai.TextResponseChoice{choice},
	}
	return &fullTextResponse
}

func documentsAIProxyLibrary(documents []LibraryDocument) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = aiProxyDocuments2Markdown(documents)
	choice.FinishReason = &constant.StopFinishReason
	return &openai.ChatCompletionsStreamResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   "",
		Choices: []openai.ChatCompletionsStreamResponseChoice{choice},
	}
}

func streamResponseAIProxyLibrary2OpenAI(response *LibraryStreamResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Content = response.Content
	return &openai.ChatCompletionsStreamResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   response.Model,
		Choices: []openai.ChatCompletionsStreamResponseChoice{choice},
	}
}

func StreamHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var usage model.Usage
	var documents []LibraryDocument
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		if i := slices.Index(data, '\n'); i >= 0 {
			return i + 1, data[0:i], nil
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	})

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

		var AIProxyLibraryResponse LibraryStreamResponse
		err := json.Unmarshal(data, &AIProxyLibraryResponse)
		if err != nil {
			logger.SysError("error unmarshalling stream response: " + err.Error())
			continue
		}
		if len(AIProxyLibraryResponse.Documents) != 0 {
			documents = AIProxyLibraryResponse.Documents
		}
		response := streamResponseAIProxyLibrary2OpenAI(&AIProxyLibraryResponse)
		err = render.ObjectData(c, response)
		if err != nil {
			logger.SysError(err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		logger.SysError("error reading stream: " + err.Error())
	}

	response := documentsAIProxyLibrary(documents)
	err := render.ObjectData(c, response)
	if err != nil {
		logger.SysError(err.Error())
	}
	render.Done(c)

	return nil, &usage
}

func Handler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var AIProxyLibraryResponse LibraryResponse
	err := json.NewDecoder(resp.Body).Decode(&AIProxyLibraryResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if AIProxyLibraryResponse.ErrCode != 0 {
		return &model.ErrorWithStatusCode{
			Error: model.Error{
				Message: AIProxyLibraryResponse.Message,
				Type:    strconv.Itoa(AIProxyLibraryResponse.ErrCode),
				Code:    AIProxyLibraryResponse.ErrCode,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responseAIProxyLibrary2OpenAI(&AIProxyLibraryResponse)
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
