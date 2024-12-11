package novita

import (
	"fmt"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

func GetRequestURL(meta *meta.Meta) (string, error) {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	if meta.Mode == relaymode.ChatCompletions {
		return u + "/chat/completions", nil
	}
	return "", fmt.Errorf("unsupported relay mode %d for novita", meta.Mode)
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://api.novita.ai/v3/openai"

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return GetRequestURL(meta)
}

func (a *Adaptor) GetChannelName() string {
	return "novita"
}
