package openai

import (
	"bytes"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertRerankRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return nil, nil, err
	}
	reqMap["model"] = meta.ActualModelName
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(jsonData), nil
}

func RerankHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var rerankResponse SlimRerankResponse
	err = json.Unmarshal(responseBody, &rerankResponse)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	c.Writer.WriteHeader(resp.StatusCode)

	_, err = c.Writer.Write(responseBody)
	if err != nil {
		log.Error("write response body failed: " + err.Error())
	}

	if rerankResponse.Meta.Tokens == nil {
		return &model.Usage{
			PromptTokens:     meta.PromptTokens,
			CompletionTokens: 0,
			TotalTokens:      meta.PromptTokens,
		}, nil
	}
	if rerankResponse.Meta.Tokens.InputTokens <= 0 {
		rerankResponse.Meta.Tokens.InputTokens = meta.PromptTokens
	}
	return &model.Usage{
		PromptTokens:     rerankResponse.Meta.Tokens.InputTokens,
		CompletionTokens: rerankResponse.Meta.Tokens.OutputTokens,
		TotalTokens:      rerankResponse.Meta.Tokens.InputTokens + rerankResponse.Meta.Tokens.OutputTokens,
	}, nil
}
