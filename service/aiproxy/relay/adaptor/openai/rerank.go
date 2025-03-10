package openai

import (
	"bytes"
	"io"
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/bytedance/sonic/ast"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertRerankRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	node, err := common.UnmarshalBody2Node(req)
	if err != nil {
		return "", nil, nil, err
	}

	_, err = node.Set("model", ast.NewString(meta.ActualModel))
	if err != nil {
		return "", nil, nil, err
	}

	jsonData, err := node.MarshalJSON()
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}

func RerankHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	if resp.StatusCode != http.StatusOK {
		return nil, ErrorHanlder(resp)
	}

	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var rerankResponse SlimRerankResponse
	err = sonic.Unmarshal(responseBody, &rerankResponse)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	c.Writer.WriteHeader(resp.StatusCode)

	_, err = c.Writer.Write(responseBody)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}

	if rerankResponse.Meta.Tokens == nil {
		return &model.Usage{
			PromptTokens:     meta.InputTokens,
			CompletionTokens: 0,
			TotalTokens:      meta.InputTokens,
		}, nil
	}
	if rerankResponse.Meta.Tokens.InputTokens <= 0 {
		rerankResponse.Meta.Tokens.InputTokens = meta.InputTokens
	}
	return &model.Usage{
		PromptTokens:     rerankResponse.Meta.Tokens.InputTokens,
		CompletionTokens: rerankResponse.Meta.Tokens.OutputTokens,
		TotalTokens:      rerankResponse.Meta.Tokens.InputTokens + rerankResponse.Meta.Tokens.OutputTokens,
	}, nil
}
