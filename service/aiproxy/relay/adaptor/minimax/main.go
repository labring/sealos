package minimax

import (
	"io"
	"net/http"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.minimax.chat"

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}
	switch meta.Mode {
	case relaymode.ChatCompletions:
		return meta.Channel.BaseURL + "/v1/text/chatcompletion_v2", nil
	default:
		return a.Adaptor.GetRequestURL(meta)
	}
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	meta.Set(openai.DoNotPatchStreamOptionsIncludeUsageMetaKey, true)
	return a.Adaptor.ConvertRequest(meta, req)
}

func (a *Adaptor) GetChannelName() string {
	return "minimax"
}
