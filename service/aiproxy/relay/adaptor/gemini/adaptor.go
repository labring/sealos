package gemini

import (
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type Adaptor struct{}

const baseURL = "https://generativelanguage.googleapis.com"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

var v1ModelMap = map[string]struct{}{}

func getRequestURL(meta *meta.Meta, action string) string {
	u := meta.Channel.BaseURL
	if u == "" {
		u = baseURL
	}
	version := "v1beta"
	if _, ok := v1ModelMap[meta.ActualModel]; ok {
		version = "v1"
	}
	return fmt.Sprintf("%s/%s/models/%s:%s", u, version, meta.ActualModel, action)
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	var action string
	switch meta.Mode {
	case relaymode.Embeddings:
		action = "batchEmbedContents"
	default:
		action = "generateContent"
	}

	if meta.GetBool("stream") {
		action = "streamGenerateContent?alt=sse"
	}
	return getRequestURL(meta, action), nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	req.Header.Set("X-Goog-Api-Key", meta.Channel.Key)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.Embeddings:
		return ConvertEmbeddingRequest(meta, req)
	case relaymode.ChatCompletions:
		return ConvertRequest(meta, req)
	default:
		return "", nil, nil, errors.New("unsupported mode")
	}
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		usage, err = EmbeddingHandler(c, resp)
	case relaymode.ChatCompletions:
		if utils.IsStreamResponse(resp) {
			usage, err = StreamHandler(meta, c, resp)
		} else {
			usage, err = Handler(meta, c, resp)
		}
	default:
		return nil, openai.ErrorWrapperWithMessage("unsupported mode", "unsupported_mode", http.StatusBadRequest)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "google gemini"
}
