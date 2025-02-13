package vertexai

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "gemini-1.5-pro-001",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-1.5-flash-001",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-pro",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
	{
		Model: "gemini-pro-vision",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerGoogle,
	},
}

type Adaptor struct{}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, request *http.Request) (string, http.Header, io.Reader, error) {
	return gemini.ConvertRequest(meta, request)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		usage, err = gemini.EmbeddingHandler(c, resp)
	default:
		if utils.IsStreamResponse(resp) {
			usage, err = gemini.StreamHandler(meta, c, resp)
		} else {
			usage, err = gemini.Handler(meta, c, resp)
		}
	}
	return
}
