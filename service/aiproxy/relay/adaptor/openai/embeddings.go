package openai

import (
	"bytes"
	"io"
	"net/http"

	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/common"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
)

const MetaEmbeddingsPatchInputToSlices = "embeddings_input_to_slices"

//nolint:gocritic
func ConvertEmbeddingsRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	reqMap := make(map[string]any)
	err := common.UnmarshalBodyReusable(req, &reqMap)
	if err != nil {
		return "", nil, nil, err
	}

	reqMap["model"] = meta.ActualModel

	if meta.GetBool(MetaEmbeddingsPatchInputToSlices) {
		switch v := reqMap["input"].(type) {
		case string:
			reqMap["input"] = []string{v}
		}
	}

	jsonData, err := json.Marshal(reqMap)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(jsonData), nil
}
