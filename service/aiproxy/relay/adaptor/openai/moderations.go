package openai

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common/logger"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ModerationsHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}

	var respMap map[string]any
	err = json.Unmarshal(body, &respMap)
	if err != nil {
		return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}

	if _, ok := respMap["error"]; ok {
		var errorResp ErrorResp
		err = json.Unmarshal(body, &errorResp)
		if err != nil {
			return nil, ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
		}
		return nil, ErrorWrapperWithMessage(errorResp.Error.Message, errorResp.Error.Code, http.StatusBadRequest)
	}

	if _, ok := respMap["model"]; ok && meta.OriginModelName != "" {
		respMap["model"] = meta.OriginModelName
	}

	usage := &model.Usage{
		PromptTokens: meta.PromptTokens,
		TotalTokens:  meta.PromptTokens,
	}

	newData, err := stdjson.Marshal(respMap)
	if err != nil {
		return usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(newData)
	if err != nil {
		logger.Error(c, "write response body failed: "+err.Error())
	}
	return usage, nil
}
