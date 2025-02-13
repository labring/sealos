package openai

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

func ModerationsHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*model.Usage, *model.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

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

	if _, ok := respMap["model"]; ok && meta.OriginModel != "" {
		respMap["model"] = meta.OriginModel
	}

	usage := &model.Usage{
		PromptTokens: meta.InputTokens,
		TotalTokens:  meta.InputTokens,
	}

	newData, err := stdjson.Marshal(respMap)
	if err != nil {
		return usage, ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}

	_, err = c.Writer.Write(newData)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return usage, nil
}
