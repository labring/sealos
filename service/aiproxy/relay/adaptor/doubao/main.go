package doubao

import (
	"fmt"
	"strings"

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
	switch meta.Mode {
	case relaymode.ChatCompletions:
		if strings.HasPrefix(meta.ActualModelName, "bot-") {
			return u + "/api/v3/bots/chat/completions", nil
		}
		return u + "/api/v3/chat/completions", nil
	case relaymode.Embeddings:
		return u + "/api/v3/embeddings", nil
	default:
		return "", fmt.Errorf("unsupported relay mode %d for doubao", meta.Mode)
	}
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://ark.cn-beijing.volces.com"

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return GetRequestURL(meta)
}

func (a *Adaptor) GetChannelName() string {
	return "doubao"
}
