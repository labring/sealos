package ai360

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "360GPT_S2_V9",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "embedding-bert-512-v1",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "embedding_s1_v1",
		Type:  relaymode.Embeddings,
	},
	{
		Model: "semantic_similarity_s1_v1",
		Type:  relaymode.Embeddings,
	},
}

type Adaptor struct {
	openai.Adaptor
}

const baseURL = "https://ai.360.cn"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}
	return a.Adaptor.GetRequestURL(meta)
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "ai360"
}
