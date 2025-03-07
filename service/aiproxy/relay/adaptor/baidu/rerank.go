package baidu

import (
	"io"
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type RerankResponse struct {
	Error *Error      `json:"error"`
	Usage model.Usage `json:"usage"`
}

func RerankHandler(_ *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	reRankResp := &RerankResponse{}
	err = sonic.Unmarshal(respBody, reRankResp)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if reRankResp.Error != nil && reRankResp.Error.ErrorCode != 0 {
		return nil, ErrorHandler(reRankResp.Error)
	}
	respMap := make(map[string]any)
	err = sonic.Unmarshal(respBody, &respMap)
	if err != nil {
		return &reRankResp.Usage, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	delete(respMap, "model")
	delete(respMap, "usage")
	respMap["meta"] = &model.RerankMeta{
		Tokens: &model.RerankMetaTokens{
			InputTokens:  reRankResp.Usage.TotalTokens,
			OutputTokens: 0,
		},
	}
	respMap["result"] = respMap["results"]
	delete(respMap, "results")
	jsonData, err := sonic.Marshal(respMap)
	if err != nil {
		return &reRankResp.Usage, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	_, err = c.Writer.Write(jsonData)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &reRankResp.Usage, nil
}
