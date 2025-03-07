package ollama

import (
	"net/http"

	"github.com/bytedance/sonic"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type errorResponse struct {
	Error string `json:"error"`
}

func ErrorHandler(resp *http.Response) *relaymodel.ErrorWithStatusCode {
	defer resp.Body.Close()

	var er errorResponse
	err := sonic.ConfigDefault.NewDecoder(resp.Body).Decode(&er)
	if err != nil {
		return openai.ErrorWrapperWithMessage("decode response error: "+err.Error(), nil, http.StatusInternalServerError)
	}
	return openai.ErrorWrapperWithMessage(er.Error, nil, http.StatusInternalServerError)
}
