package zhipu

import (
	"errors"
	"fmt"
	"io"
	"math"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

type Adaptor struct {
	APIVersion string
}

func (a *Adaptor) Init(_ *meta.Meta) {
}

func (a *Adaptor) SetVersionByModeName(modelName string) {
	if strings.HasPrefix(modelName, "glm-") {
		a.APIVersion = "v4"
	} else {
		a.APIVersion = "v3"
	}
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	switch meta.Mode {
	case relaymode.ImagesGenerations:
		return meta.BaseURL + "/api/paas/v4/images/generations", nil
	case relaymode.Embeddings:
		return meta.BaseURL + "/api/paas/v4/embeddings", nil
	}
	a.SetVersionByModeName(meta.ActualModelName)
	if a.APIVersion == "v4" {
		return meta.BaseURL + "/api/paas/v4/chat/completions", nil
	}
	method := "invoke"
	if meta.IsStream {
		method = "sse-invoke"
	}
	return fmt.Sprintf("%s/api/paas/v3/model-api/%s/%s", meta.BaseURL, meta.ActualModelName, method), nil
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Request, meta *meta.Meta) error {
	adaptor.SetupCommonRequestHeader(c, req, meta)
	token := GetToken(meta.APIKey)
	req.Header.Set("Authorization", token)
	return nil
}

func (a *Adaptor) ConvertRequest(_ *gin.Context, relayMode int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	switch relayMode {
	case relaymode.Embeddings:
		baiduEmbeddingRequest, err := ConvertEmbeddingRequest(*request)
		return baiduEmbeddingRequest, err
	default:
		// TopP (0.0, 1.0)
		if request.TopP != nil {
			*request.TopP = math.Min(0.99, *request.TopP)
			*request.TopP = math.Max(0.01, *request.TopP)
		}

		// Temperature (0.0, 1.0)
		if request.Temperature != nil {
			*request.Temperature = math.Min(0.99, *request.Temperature)
			*request.Temperature = math.Max(0.01, *request.Temperature)
		}
		a.SetVersionByModeName(request.Model)
		if a.APIVersion == "v4" {
			return request, nil
		}
		return ConvertRequest(request), nil
	}
}

func (a *Adaptor) ConvertImageRequest(request *relaymodel.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	newRequest := ImageRequest{
		Model:  request.Model,
		Prompt: request.Prompt,
		UserID: request.User,
	}
	return newRequest, nil
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

func (a *Adaptor) DoResponseV4(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if meta.IsStream {
		err, _, usage = openai.StreamHandler(c, resp, meta.Mode)
	} else {
		err, usage = openai.Handler(c, resp, meta.PromptTokens, meta.ActualModelName)
	}
	return
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	switch meta.Mode {
	case relaymode.Embeddings:
		err, usage = EmbeddingsHandler(c, resp)
		return
	case relaymode.ImagesGenerations:
		err, usage = openai.ImageHandler(c, resp)
		return
	}
	if a.APIVersion == "v4" {
		return a.DoResponseV4(c, resp, meta)
	}
	if meta.IsStream {
		err, usage = StreamHandler(c, resp)
	} else {
		if meta.Mode == relaymode.Embeddings {
			err, usage = EmbeddingsHandler(c, resp)
		} else {
			err, usage = Handler(c, resp)
		}
	}
	return
}

func ConvertEmbeddingRequest(request relaymodel.GeneralOpenAIRequest) (*EmbeddingRequest, error) {
	return &EmbeddingRequest{
		Model: request.Model,
		Input: request.Input,
	}, nil
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return "zhipu"
}
