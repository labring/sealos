package baiduv2

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

type Adaptor struct{}

const (
	baseURL = "https://qianfan.baidubce.com/v2"
)

func (a *Adaptor) GetBaseURL() string {
	return baseURL
}

// https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Fm2vrveyu
var v2ModelMap = map[string]string{
	"ERNIE-Character-8K":         "ernie-char-8k",
	"ERNIE-Character-Fiction-8K": "ernie-char-fiction-8k",
}

func toV2ModelName(modelName string) string {
	if v2Model, ok := v2ModelMap[modelName]; ok {
		return v2Model
	}
	return strings.ToLower(modelName)
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		return meta.Channel.BaseURL + "/chat/completions", nil
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

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	switch meta.Mode {
	case relaymode.ChatCompletions:
		actModel := meta.ActualModel
		v2Model := toV2ModelName(actModel)
		if v2Model != actModel {
			meta.ActualModel = v2Model
			defer func() { meta.ActualModel = actModel }()
		}
		return openai.ConvertRequest(meta, req)
	default:
		return "", nil, nil, fmt.Errorf("unsupported mode: %d", meta.Mode)
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
