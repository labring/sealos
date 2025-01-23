package openai

import (
	"bytes"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func ConvertTTSRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	textRequest := relaymodel.TextToSpeechRequest{}
	err := common.UnmarshalBodyReusable(req, &textRequest)
	if err != nil {
		return "", nil, nil, err
	}
	if len(textRequest.Input) > 4096 {
		return "", nil, nil, errors.New("input is too long (over 4096 characters)")
	}
	reqMap := make(map[string]any)
	err = common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	reqMap["model"] = meta.ActualModel
	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}

func TTSHandler(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	defer resp.Body.Close()

	log := middleware.GetLogger(c)

	for k, v := range resp.Header {
		c.Writer.Header().Set(k, v[0])
	}

	_, err := io.Copy(c.Writer, resp.Body)
	if err != nil {
		log.Warnf("write response body failed: %v", err)
	}
	return &relaymodel.Usage{
		PromptTokens:     meta.InputTokens,
		CompletionTokens: 0,
		TotalTokens:      meta.InputTokens,
	}, nil
}
