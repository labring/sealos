package ali

import (
	"net/http"
	"strings"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://help.aliyun.com/document_detail/613695.html?spm=a2c4g.2399480.0.0.1adb778fAdzP9w#341800c0f8w0r

func ConvertRequest(request *relaymodel.GeneralOpenAIRequest) *relaymodel.GeneralOpenAIRequest {
	if request.TopP != nil && *request.TopP >= 1 {
		*request.TopP = 0.9999
	}
	if request.Stream {
		if request.StreamOptions == nil {
			request.StreamOptions = &relaymodel.StreamOptions{}
		}
		request.StreamOptions.IncludeUsage = true
	}
	if !strings.HasPrefix(request.Model, "qwen-vl") {
		for _, message := range request.Messages {
			message.ToStringContentMessage()
		}
	}
	return request
}

func ConvertEmbeddingRequest(request *relaymodel.GeneralOpenAIRequest) *EmbeddingRequest {
	return &EmbeddingRequest{
		Model: request.Model,
		Input: struct {
			Texts []string `json:"texts"`
		}{
			Texts: request.ParseInput(),
		},
	}
}

func ConvertImageRequest(request *relaymodel.ImageRequest) *ImageRequest {
	var imageRequest ImageRequest
	imageRequest.Input.Prompt = request.Prompt
	imageRequest.Model = request.Model
	imageRequest.Parameters.Size = strings.Replace(request.Size, "x", "*", -1)
	imageRequest.Parameters.N = request.N
	imageRequest.ResponseFormat = request.ResponseFormat

	return &imageRequest
}

func EmbeddingHandler(c *gin.Context, resp *http.Response) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
	var aliResponse EmbeddingResponse
	err := json.NewDecoder(resp.Body).Decode(&aliResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}

	err = resp.Body.Close()
	if err != nil {
		return openai.ErrorWrapper(err, "close_response_body_failed", http.StatusInternalServerError), nil
	}

	if aliResponse.Code != "" {
		return &relaymodel.ErrorWithStatusCode{
			Error: relaymodel.Error{
				Message: aliResponse.Message,
				Type:    aliResponse.Code,
				Param:   aliResponse.RequestID,
				Code:    aliResponse.Code,
			},
			StatusCode: resp.StatusCode,
		}, nil
	}
	requestModel := c.GetString(ctxkey.RequestModel)
	fullTextResponse := embeddingResponseAli2OpenAI(&aliResponse)
	fullTextResponse.Model = requestModel
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func embeddingResponseAli2OpenAI(response *EmbeddingResponse) *openai.EmbeddingResponse {
	openAIEmbeddingResponse := openai.EmbeddingResponse{
		Object: "list",
		Data:   make([]*openai.EmbeddingResponseItem, 0, len(response.Output.Embeddings)),
		Model:  "text-embedding-v1",
		Usage:  relaymodel.Usage{TotalTokens: response.Usage.TotalTokens},
	}

	for _, item := range response.Output.Embeddings {
		openAIEmbeddingResponse.Data = append(openAIEmbeddingResponse.Data, &openai.EmbeddingResponseItem{
			Object:    `embedding`,
			Index:     item.TextIndex,
			Embedding: item.Embedding,
		})
	}
	return &openAIEmbeddingResponse
}
