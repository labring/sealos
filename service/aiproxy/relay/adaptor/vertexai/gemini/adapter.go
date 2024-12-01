package vertexai

import (
	"bytes"
	"io"
	"net/http"

	json "github.com/json-iterator/go"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
	"github.com/pkg/errors"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "gemini-1.5-pro-001",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-1.5-flash-001",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-pro",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "gemini-pro-vision",
		Type:  relaymode.ChatCompletions,
	},
}

type Adaptor struct{}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, request *http.Request) (http.Header, io.Reader, error) {
	if request == nil {
		return nil, nil, errors.New("request is nil")
	}

	geminiRequest, err := gemini.ConvertRequest(meta, request)
	if err != nil {
		return nil, nil, err
	}
	data, err := json.Marshal(geminiRequest)
	if err != nil {
		return nil, nil, err
	}
	return nil, bytes.NewReader(data), nil
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if utils.IsStreamResponse(resp) {
		var responseText string
		err, responseText = gemini.StreamHandler(c, resp)
		usage = openai.ResponseText2Usage(responseText, meta.ActualModelName, meta.PromptTokens)
	} else {
		switch meta.Mode {
		case relaymode.Embeddings:
			err, usage = gemini.EmbeddingHandler(c, resp)
		default:
			err, usage = gemini.Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
		}
	}
	return
}
