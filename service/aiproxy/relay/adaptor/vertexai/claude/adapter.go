package vertexai

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/pkg/errors"

	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var ModelList = []*model.ModelConfigItem{
	{
		Model: "claude-3-haiku@20240307",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "claude-3-sonnet@20240229",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "claude-3-opus@20240229",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "claude-3-5-sonnet@20240620",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "claude-3-5-sonnet-v2@20241022",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "claude-3-5-haiku@20241022",
		Type:  relaymode.ChatCompletions,
	},
}

const anthropicVersion = "vertex-2023-10-16"

type Adaptor struct{}

func (a *Adaptor) ConvertRequest(c *gin.Context, _ int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	claudeReq := anthropic.ConvertRequest(request)
	req := Request{
		AnthropicVersion: anthropicVersion,
		// Model:            claudeReq.Model,
		Messages:    claudeReq.Messages,
		System:      claudeReq.System,
		MaxTokens:   claudeReq.MaxTokens,
		Temperature: claudeReq.Temperature,
		TopP:        claudeReq.TopP,
		TopK:        claudeReq.TopK,
		Stream:      claudeReq.Stream,
		Tools:       claudeReq.Tools,
	}

	c.Set(ctxkey.RequestModel, request.Model)
	c.Set(ctxkey.ConvertedRequest, req)
	return req, nil
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if meta.IsStream {
		err, usage = anthropic.StreamHandler(c, resp)
	} else {
		err, usage = anthropic.Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
	}
	return
}
