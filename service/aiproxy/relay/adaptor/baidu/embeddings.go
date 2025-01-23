package baidu

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type EmbeddingsResponse struct {
	*Error
	Usage relaymodel.Usage `json:"usage"`
}

func EmbeddingsHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
	}
	var baiduResponse EmbeddingsResponse
	err = json.Unmarshal(body, &baiduResponse)
	if err != nil {
		return nil, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	if baiduResponse.Error != nil && baiduResponse.Error.ErrorCode != 0 {
		return &baiduResponse.Usage, openai.ErrorWrapperWithMessage(baiduResponse.Error.ErrorMsg, "baidu_error_"+strconv.Itoa(baiduResponse.Error.ErrorCode), http.StatusInternalServerError)
	}

	respMap := make(map[string]any)
	err = json.Unmarshal(body, &respMap)
	if err != nil {
		return &baiduResponse.Usage, openai.ErrorWrapper(err, "unmarshal_response_body_failed", http.StatusInternalServerError)
	}
	respMap["model"] = meta.OriginModel
	respMap["object"] = "list"

	data, err := json.Marshal(respMap)
	if err != nil {
		return &baiduResponse.Usage, openai.ErrorWrapper(err, "marshal_response_body_failed", http.StatusInternalServerError)
	}
	_, err = c.Writer.Write(data)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &baiduResponse.Usage, nil
}
