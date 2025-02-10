package siliconflow

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var _ adaptor.Adaptor = (*Adaptor)(nil)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.siliconflow.cn/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "siliconflow"
}

//nolint:gocritic
func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode) {
	usage, err := a.Adaptor.DoResponse(meta, c, resp)
	if err != nil {
		return nil, err
	}
	switch meta.Mode {
	case relaymode.AudioSpeech:
		size := c.Writer.Size()
		usage = &relaymodel.Usage{
			CompletionTokens: size,
			TotalTokens:      size,
		}
	}
	return usage, nil
}
