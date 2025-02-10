package tencent

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
)

// https://cloud.tencent.com/document/api/1729/101837

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.hunyuan.cloud.tencent.com/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "tencent"
}
