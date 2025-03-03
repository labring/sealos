package anthropic

import (
	"bytes"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	json "github.com/json-iterator/go"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type Adaptor struct{}

const baseURL = "https://api.anthropic.com/v1"

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return meta.Channel.BaseURL + "/messages", nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, c *gin.Context, req *http.Request) error {
	req.Header.Set("X-Api-Key", meta.Channel.Key)
	anthropicVersion := c.Request.Header.Get("Anthropic-Version")
	if anthropicVersion == "" {
		anthropicVersion = "2023-06-01"
	}
	req.Header.Set("Anthropic-Version", anthropicVersion)
	req.Header.Set("Anthropic-Beta", "messages-2023-12-15")

	// https://x.com/alexalbert__/status/1812921642143900036
	// claude-3-5-sonnet can support 8k context
	if strings.HasPrefix(meta.ActualModel, "claude-3-5-sonnet") {
		req.Header.Set("Anthropic-Beta", "max-tokens-3-5-sonnet-2024-07-15")
	}

	if strings.HasPrefix(meta.ActualModel, "claude-3-7-sonnet") {
		req.Header.Set("Anthropic-Beta", "output-128k-2025-02-19")
	}

	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	data, err := ConvertRequest(meta, req)
	if err != nil {
		return "", nil, nil, err
	}

	data2, err := json.Marshal(data)
	if err != nil {
		return "", nil, nil, err
	}
	return http.MethodPost, nil, bytes.NewReader(data2), nil
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if utils.IsStreamResponse(resp) {
		err, usage = StreamHandler(meta, c, resp)
	} else {
		err, usage = Handler(meta, c, resp)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "anthropic"
}
