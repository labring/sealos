package ali

import (
	"io"
	"net/http"
	"strings"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://help.aliyun.com/document_detail/613695.html?spm=a2c4g.2399480.0.0.1adb778fAdzP9w#341800c0f8w0r

func ConvertImageRequest(request *relaymodel.ImageRequest) *ImageRequest {
	var imageRequest ImageRequest
	imageRequest.Input.Prompt = request.Prompt
	imageRequest.Model = request.Model
	imageRequest.Parameters.Size = strings.ReplaceAll(request.Size, "x", "*")
	imageRequest.Parameters.N = request.N
	imageRequest.ResponseFormat = request.ResponseFormat

	return &imageRequest
}

func EmbeddingHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.ErrorWithStatusCode, *relaymodel.Usage) {
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
	requestModel := meta.OriginModelName
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

type RerankResponse struct {
	Usage     *RerankUsage `json:"usage"`
	RequestID string       `json:"request_id"`
	Output    RerankOutput `json:"output"`
}
type RerankOutput struct {
	Results []*relaymodel.RerankResult `json:"results"`
}
type RerankUsage struct {
	TotalTokens int `json:"total_tokens"`
}

func RerankHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	defer resp.Body.Close()

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var rerankResponse RerankResponse
	err = json.Unmarshal(responseBody, &rerankResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	c.Writer.WriteHeader(resp.StatusCode)

	rerankResp := relaymodel.RerankResponse{
		Meta: relaymodel.RerankMeta{
			Tokens: &relaymodel.RerankMetaTokens{
				InputTokens:  rerankResponse.Usage.TotalTokens,
				OutputTokens: 0,
			},
		},
		Result: rerankResponse.Output.Results,
		ID:     rerankResponse.RequestID,
	}

	var usage *relaymodel.Usage
	if rerankResponse.Usage == nil {
		usage = &relaymodel.Usage{
			PromptTokens:     meta.PromptTokens,
			CompletionTokens: 0,
			TotalTokens:      meta.PromptTokens,
		}
	} else {
		usage = &relaymodel.Usage{
			PromptTokens: rerankResponse.Usage.TotalTokens,
			TotalTokens:  rerankResponse.Usage.TotalTokens,
		}
	}

	jsonResponse, err := json.Marshal(&rerankResp)
	if err != nil {
		return usage, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	_, err = c.Writer.Write(jsonResponse)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}
	return usage, nil
}
