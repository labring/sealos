package zhipu

import (
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://open.bigmodel.cn/doc/api#chatglm_std
// chatglm_std, chatglm_lite
// https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_std/invoke
// https://open.bigmodel.cn/api/paas/v3/model-api/chatglm_std/sse-invoke

func EmbeddingsHandler(c *gin.Context, resp *http.Response) (*model.ErrorWithStatusCode, *model.Usage) {
	defer resp.Body.Close()

	var zhipuResponse EmbeddingResponse
	err := json.NewDecoder(resp.Body).Decode(&zhipuResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError), nil
	}
	fullTextResponse := embeddingResponseZhipu2OpenAI(&zhipuResponse)
	jsonResponse, err := json.Marshal(fullTextResponse)
	if err != nil {
		return openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError), nil
	}
	c.Writer.Header().Set("Content-Type", "application/json")
	c.Writer.WriteHeader(resp.StatusCode)
	_, _ = c.Writer.Write(jsonResponse)
	return nil, &fullTextResponse.Usage
}

func embeddingResponseZhipu2OpenAI(response *EmbeddingResponse) *openai.EmbeddingResponse {
	openAIEmbeddingResponse := openai.EmbeddingResponse{
		Object: "list",
		Data:   make([]*openai.EmbeddingResponseItem, 0, len(response.Embeddings)),
		Model:  response.Model,
		Usage: model.Usage{
			PromptTokens:     response.PromptTokens,
			CompletionTokens: response.CompletionTokens,
			TotalTokens:      response.Usage.TotalTokens,
		},
	}

	for _, item := range response.Embeddings {
		openAIEmbeddingResponse.Data = append(openAIEmbeddingResponse.Data, &openai.EmbeddingResponseItem{
			Object:    `embedding`,
			Index:     item.Index,
			Embedding: item.Embedding,
		})
	}
	return &openAIEmbeddingResponse
}
