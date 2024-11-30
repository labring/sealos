package xunfei

import (
	"io"
	"net/http"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
)

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://spark-api-open.xf-yun.com"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}
	return a.Adaptor.GetRequestURL(meta)
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	domain, err := getXunfeiDomain(meta.ActualModelName)
	if err != nil {
		return nil, nil, err
	}
	model := meta.ActualModelName
	meta.ActualModelName = domain
	defer func() {
		meta.ActualModelName = model
	}()
	h, body, err := a.Adaptor.ConvertRequest(meta, req)
	if err != nil {
		return nil, nil, err
	}
	return h, body, nil
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "xunfei"
}
