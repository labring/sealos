package utils

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/common/client"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

func UnmarshalGeneralOpenAIRequest(req *http.Request) (*relaymodel.GeneralOpenAIRequest, error) {
	var request relaymodel.GeneralOpenAIRequest
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func UnmarshalImageRequest(req *http.Request) (*relaymodel.ImageRequest, error) {
	var request relaymodel.ImageRequest
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func UnmarshalRerankRequest(req *http.Request) (*relaymodel.RerankRequest, error) {
	var request relaymodel.RerankRequest
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func UnmarshalTTSRequest(req *http.Request) (*relaymodel.TextToSpeechRequest, error) {
	var request relaymodel.TextToSpeechRequest
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, err
	}
	return &request, nil
}

func DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	resp, err := client.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func IsStreamResponse(resp *http.Response) bool {
	return strings.Contains(resp.Header.Get("Content-Type"), "event-stream")
}
