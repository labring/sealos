package baiduv2

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"

	"github.com/gin-gonic/gin"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type Adaptor struct{}

const (
	baseURL = "https://qianfan.baidubce.com"
)

// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu
var v2ModelMap = map[string]string{
	"ERNIE-4.0-8K-Latest":        "ernie-4.0-8k-latest",
	"ERNIE-4.0-8K-Preview":       "ernie-4.0-8k-preview",
	"ERNIE-4.0-8K":               "ernie-4.0-8k",
	"ERNIE-4.0-Turbo-8K-Latest":  "ernie-4.0-turbo-8k-latest",
	"ERNIE-4.0-Turbo-8K-Preview": "ernie-4.0-turbo-8k-preview",
	"ERNIE-4.0-Turbo-8K":         "ernie-4.0-turbo-8k",
	"ERNIE-4.0-Turbo-128K":       "ernie-4.0-turbo-128k",
	"ERNIE-3.5-8K-Preview":       "ernie-3.5-8k-preview",
	"ERNIE-3.5-8K":               "ernie-3.5-8k",
	"ERNIE-3.5-128K":             "ernie-3.5-128k",
	"ERNIE-Speed-8K":             "ernie-speed-8k",
	"ERNIE-Speed-128K":           "ernie-speed-128k",
	"ERNIE-Speed-Pro-128K":       "ernie-speed-pro-128k",
	"ERNIE-Lite-8K":              "ernie-lite-8k",
	"ERNIE-Lite-Pro-128K":        "ernie-lite-pro-128k",
	"ERNIE-Tiny-8K":              "ernie-tiny-8k",
	"ERNIE-Character-8K":         "ernie-char-8k",
	"ERNIE-Character-Fiction-8K": "ernie-char-fiction-8k",
	"ERNIE-Novel-8K":             "ernie-novel-8k",
}

func toV2ModelName(modelName string) string {
	if v2Model, ok := v2ModelMap[modelName]; ok {
		return v2Model
	}
	return strings.ToLower(modelName)
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	if meta.Channel.BaseURL == "" {
		meta.Channel.BaseURL = baseURL
	}

	switch meta.Mode {
	case relaymode.ChatCompletions:
		return meta.Channel.BaseURL + "/v2/chat/completions", nil
	default:
		return "", fmt.Errorf("unsupported mode: %d", meta.Mode)
	}
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	token, err := GetBearerToken(context.Background(), meta.Channel.Key)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token.Token)
	return nil
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		actModel := meta.ActualModelName
		v2Model := toV2ModelName(actModel)
		meta.ActualModelName = v2Model
		defer func() { meta.ActualModelName = actModel }()
		return openai.ConvertRequest(meta, req)
	default:
		return nil, nil, fmt.Errorf("unsupported mode: %d", meta.Mode)
	}
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		return openai.DoResponse(meta, c, resp)
	default:
		return nil, openai.ErrorWrapperWithMessage(
			fmt.Sprintf("unsupported mode: %d", meta.Mode),
			nil,
			http.StatusBadRequest,
		)
	}
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "baidu v2"
}
