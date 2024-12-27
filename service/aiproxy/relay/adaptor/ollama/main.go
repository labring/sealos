package ollama

import (
	"bufio"
	"bytes"
	"io"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/conv"
	"github.com/labring/sealos/service/aiproxy/common/render"
	"github.com/labring/sealos/service/aiproxy/middleware"

	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/common/random"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/image"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/constant"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

func ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	var request relaymodel.GeneralOpenAIRequest
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, nil, err
	}
	request.Model = meta.ActualModelName

	ollamaRequest := ChatRequest{
		Model: request.Model,
		Options: &Options{
			Seed:             int(request.Seed),
			Temperature:      request.Temperature,
			TopP:             request.TopP,
			FrequencyPenalty: request.FrequencyPenalty,
			PresencePenalty:  request.PresencePenalty,
			NumPredict:       request.MaxTokens,
			NumCtx:           request.NumCtx,
		},
		Stream: request.Stream,
	}
	for _, message := range request.Messages {
		openaiContent := message.ParseContent()
		var imageUrls []string
		var contentText string
		for _, part := range openaiContent {
			switch part.Type {
			case relaymodel.ContentTypeText:
				contentText = part.Text
			case relaymodel.ContentTypeImageURL:
				_, data, err := image.GetImageFromURL(req.Context(), part.ImageURL.URL)
				if err != nil {
					return nil, nil, err
				}
				imageUrls = append(imageUrls, data)
			}
		}
		ollamaRequest.Messages = append(ollamaRequest.Messages, Message{
			Role:    message.Role,
			Content: contentText,
			Images:  imageUrls,
		})
	}

	data, err := json.Marshal(ollamaRequest)
	if err != nil {
		return nil, nil, err
	}

	return nil, bytes.NewReader(data), nil
}

func responseOllama2OpenAI(response *ChatResponse) *openai.TextResponse {
	choice := openai.TextResponseChoice{
		Index: 0,
		Message: relaymodel.Message{
			Role:    response.Message.Role,
			Content: response.Message.Content,
		},
	}
	if response.Done {
		choice.FinishReason = "stop"
	}
	fullTextResponse := openai.TextResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Model:   response.Model,
		Object:  "chat.completion",
		Created: helper.GetTimestamp(),
		Choices: []*openai.TextResponseChoice{&choice},
		Usage: relaymodel.Usage{
			PromptTokens:     response.PromptEvalCount,
			CompletionTokens: response.EvalCount,
			TotalTokens:      response.PromptEvalCount + response.EvalCount,
		},
	}
	return &fullTextResponse
}

func streamResponseOllama2OpenAI(ollamaResponse *ChatResponse) *openai.ChatCompletionsStreamResponse {
	var choice openai.ChatCompletionsStreamResponseChoice
	choice.Delta.Role = ollamaResponse.Message.Role
	choice.Delta.Content = ollamaResponse.Message.Content
	if ollamaResponse.Done {
		choice.FinishReason = &constant.StopFinishReason
	}
	response := openai.ChatCompletionsStreamResponse{
		ID:      "chatcmpl-" + random.GetUUID(),
		Object:  "chat.completion.chunk",
		Created: helper.GetTimestamp(),
		Model:   ollamaResponse.Model,
		Choices: []*openai.ChatCompletionsStreamResponseChoice{&choice},
	}
	return &response
}

func StreamHandler(c *gin.Context, resp *http.Response) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	var usage relaymodel.Usage
	scanner := bufio.NewScanner(resp.Body)
	scanner.Split(func(data []byte, atEOF bool) (advance int, token []byte, err error) {
		if atEOF && len(data) == 0 {
			return 0, nil, nil
		}
		if i := strings.Index(conv.BytesToString(data), "}\n"); i >= 0 {
			return i + 2, data[0 : i+1], nil
		}
		if atEOF {
			return len(data), data, nil
		}
		return 0, nil, nil
	})

	common.SetEventStreamHeaders(c)

	for scanner.Scan() {
		data := scanner.Text()
		if strings.HasPrefix(data, "}") {
			data = strings.TrimPrefix(data, "}") + "}"
		}

		var ollamaResponse ChatResponse
		err := json.Unmarshal(conv.StringToBytes(data), &ollamaResponse)
		if err != nil {
			log.Error("error unmarshalling stream response: " + err.Error())
			continue
		}

		if ollamaResponse.EvalCount != 0 {
			usage.PromptTokens = ollamaResponse.PromptEvalCount
			usage.CompletionTokens = ollamaResponse.EvalCount
			usage.TotalTokens = ollamaResponse.PromptEvalCount + ollamaResponse.EvalCount
		}

		response := streamResponseOllama2OpenAI(&ollamaResponse)
		err = render.ObjectData(c, response)
		if err != nil {
			log.Error("error rendering stream response: " + err.Error())
		}
	}

	if err := scanner.Err(); err != nil {
		log.Error("error reading stream: " + err.Error())
	}

	render.Done(c)

	return nil, &usage
}

func ConvertEmbeddingRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	request, err := utils.UnmarshalGeneralOpenAIRequest(req)
	if err != nil {
		return nil, nil, err
	}
	request.Model = meta.ActualModelName
	data, err := json.Marshal(&EmbeddingRequest{
		Model: request.Model,
		Input: request.ParseInput(),
		Options: &Options{
			Seed:             int(request.Seed),
			Temperature:      request.Temperature,
			TopP:             request.TopP,
			FrequencyPenalty: request.FrequencyPenalty,
			PresencePenalty:  request.PresencePenalty,
		},
	})
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(data), nil
}

func EmbeddingHandler(c *gin.Context, resp *http.Response) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	defer resp.Body.Close()

	var ollamaResponse EmbeddingResponse
	err := json.NewDecoder(resp.Body).Decode(&ollamaResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	if ollamaResponse.Error != "" {
		return &relaymodel.ErrorWithStatusCode{
			Error: relaymodel.Error{
				Message: ollamaResponse.Error,
				Type:    "ollama_error",
				Param:   "",
				Code:    "ollama_error",
			},
			StatusCode: resp.StatusCode,
		}, nil
	}

	fullTextResponse := embeddingResponseOllama2OpenAI(&ollamaResponse)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func embeddingResponseOllama2OpenAI(response *EmbeddingResponse) *openai.EmbeddingResponse {
	openAIEmbeddingResponse := openai.EmbeddingResponse{
		Object: "list",
		Data:   make([]*openai.EmbeddingResponseItem, 0, 1),
		Model:  response.Model,
		Usage:  relaymodel.Usage{TotalTokens: 0},
	}

	for i, embedding := range response.Embeddings {
		openAIEmbeddingResponse.Data = append(openAIEmbeddingResponse.Data, &openai.EmbeddingResponseItem{
			Object:    `embedding`,
			Index:     i,
			Embedding: embedding,
		})
	}
	return &openAIEmbeddingResponse
}

func Handler(c *gin.Context, resp *http.Response) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	defer resp.Body.Close()

	var ollamaResponse ChatResponse
	err := json.NewDecoder(resp.Body).Decode(&ollamaResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	if ollamaResponse.Error != "" {
		return &relaymodel.ErrorWithStatusCode{
			Error: relaymodel.Error{
				Message: ollamaResponse.Error,
				Type:    "ollama_error",
				Param:   "",
				Code:    "ollama_error",
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	fullTextResponse := responseOllama2OpenAI(&ollamaResponse)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}
