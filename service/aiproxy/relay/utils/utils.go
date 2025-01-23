package utils

import (
	"net/http"
	"strings"

	"github.com/labring/sealos/service/aiproxy/common"
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

func UnmarshalMap(req *http.Request) (map[string]any, error) {
	var request map[string]any
	err := common.UnmarshalBodyReusable(req, &request)
	if err != nil {
		return nil, err
	}
	return request, nil
}

var defaultClient = &http.Client{}

func DoRequest(req *http.Request) (*http.Response, error) {
	resp, err := defaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	return resp, nil
}

func IsStreamResponse(resp *http.Response) bool {
	return strings.Contains(resp.Header.Get("Content-Type"), "event-stream")
}
