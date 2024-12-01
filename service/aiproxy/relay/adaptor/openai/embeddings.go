package openai

import (
	"bytes"
	"io"
	"net/http"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
)

func ConvertEmbeddingsRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
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
