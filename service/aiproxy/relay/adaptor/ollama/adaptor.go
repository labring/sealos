package ollama

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"

	"github.com/gin-gonic/gin"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type Adaptor struct{}

const baseURL = "http://localhost:11434"

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	// https://github.com/ollama/ollama/blob/main/docs/api.md
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	switch meta.Mode {
	case relaymode.Embeddings:
		return u + "/api/embed", nil
	case relaymode.ChatCompletions:
		return u + "/api/chat", nil
	default:
		return "", fmt.Errorf("unsupported mode: %d", meta.Mode)
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("Authorization", "Bearer "+meta.Channel.Key)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, request *http.Request) (http.Header, io.Reader, error) {
	if request == nil {
		return nil, nil, errors.New("request is nil")
	}
	switch meta.Mode {
	case relaymode.Embeddings:
		return ConvertEmbeddingRequest(meta, request)
	case relaymode.ChatCompletions:
		return ConvertRequest(meta, request)
	default:
		return nil, nil, fmt.Errorf("unsupported mode: %d", meta.Mode)
	}
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) ConvertSTTRequest(*http.Request) (io.Reader, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertTTSRequest(*relaymodel.TextToSpeechRequest) (any, error) {
	return nil, errors.New("not implemented")
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		err, usage = EmbeddingHandler(c, resp)
	default:
		if utils.IsStreamResponse(resp) {
			err, usage = StreamHandler(c, resp)
		} else {
			err, usage = Handler(c, resp)
		}
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "ollama"
}
