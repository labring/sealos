package tencent

import (
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/helper"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

// https://cloud.tencent.com/document/api/1729/101837

type Adaptor struct {
	meta      *meta.Meta
	Sign      string
	Action    string
	Version   string
	Timestamp int64
}

func (a *Adaptor) Init(meta *meta.Meta) {
	a.Action = "ChatCompletions"
	a.Version = "2023-09-01"
	a.Timestamp = helper.GetTimestamp()
	a.meta = meta
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	return meta.BaseURL + "/", nil
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Request, meta *meta.Meta) error {
	adaptor.SetupCommonRequestHeader(c, req, meta)
	req.Header.Set("Authorization", a.Sign)
	req.Header.Set("X-Tc-Action", a.Action)
	req.Header.Set("X-Tc-Version", a.Version)
	req.Header.Set("X-Tc-Timestamp", strconv.FormatInt(a.Timestamp, 10))
	return nil
}

func (a *Adaptor) ConvertRequest(_ *gin.Context, _ int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	_, secretID, secretKey, err := ParseConfig(a.meta.APIKey)
	if err != nil {
		return nil, err
	}
	// we have to calculate the sign here
	a.Sign = GetSign(request, a, secretID, secretKey)
	return request, nil
}

func (a *Adaptor) ConvertImageRequest(request *relaymodel.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) DoRequest(c *gin.Context, meta *meta.Meta, requestBody io.Reader) (*http.Response, error) {
	return adaptor.DoRequestHelper(a, c, meta, requestBody)
}

func (a *Adaptor) ConvertSTTRequest(*http.Request) (io.ReadCloser, error) {
	return nil, nil
}

func (a *Adaptor) ConvertTTSRequest(*relaymodel.TextToSpeechRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if meta.IsStream {
		var responseText string
		err, responseText = StreamHandler(c, resp)
		usage = openai.ResponseText2Usage(responseText, meta.ActualModelName, meta.PromptTokens)
	} else {
		err, usage = Handler(c, resp)
	}
	return
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "tencent"
}
