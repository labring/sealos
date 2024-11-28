package vertexai

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
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

func (a *Adaptor) ConvertRequest(c *gin.Context, _ int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	geminiRequest := gemini.ConvertRequest(request)
	c.Set(ctxkey.RequestModel, request.Model)
	c.Set(ctxkey.ConvertedRequest, geminiRequest)
	return geminiRequest, nil
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if meta.IsStream {
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
