package stepfun

import (
	"io"
	"net/http"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.stepfun.com/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.AudioSpeech:
		return openai.ConvertTTSRequest(meta, req, "cixingnansheng")
	default:
		return a.Adaptor.ConvertRequest(meta, req)
	}
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "stepfun"
}

func (a *Adaptor) GetBalance(channel *model.Channel) (float64, error) {
	return 0, adaptor.ErrGetBalanceNotImplemented
}
