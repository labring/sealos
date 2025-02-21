package zhipu

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://open.bigmodel.cn/api/paas/v4"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		err, usage = EmbeddingsHandler(c, resp)
	default:
		usage, err = openai.DoResponse(meta, c, resp)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "zhipu"
}
