package vertexai

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	channelhelper "github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var _ channelhelper.Adaptor = new(Adaptor)

const channelName = "vertexai"

type Adaptor struct{}

func (a *Adaptor) ConvertSTTRequest(*http.Request) (io.ReadCloser, error) {
	return nil, nil
}

func (a *Adaptor) ConvertTTSRequest(*relaymodel.TextToSpeechRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) Init(_ *meta.Meta) {
}

func (a *Adaptor) ConvertRequest(c *gin.Context, relayMode int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	adaptor := GetAdaptor(request.Model)
	if adaptor == nil {
		return nil, errors.New("adaptor not found")
	}

	return adaptor.ConvertRequest(c, relayMode, request)
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	adaptor := GetAdaptor(meta.ActualModelName)
	if adaptor == nil {
		return nil, &relaymodel.ErrorWithStatusCode{
			StatusCode: http.StatusInternalServerError,
			Error: relaymodel.Error{
				Message: "adaptor not found",
			},
		}
	}
	return adaptor.DoResponse(c, resp, meta)
}

func (a *Adaptor) GetModelList() []*model.ModelConfigItem {
	return modelList
}

func (a *Adaptor) GetChannelName() string {
	return channelName
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	var suffix string
	if strings.HasPrefix(meta.ActualModelName, "gemini") {
		if meta.IsStream {
			suffix = "streamGenerateContent?alt=sse"
		} else {
			suffix = "generateContent"
		}
	} else {
		if meta.IsStream {
			suffix = "streamRawPredict?alt=sse"
		} else {
			suffix = "rawPredict"
		}
	}

	if meta.BaseURL != "" {
		return fmt.Sprintf(
			"%s/v1/projects/%s/locations/%s/publishers/google/models/%s:%s",
			meta.BaseURL,
			meta.Config.VertexAIProjectID,
			meta.Config.Region,
			meta.ActualModelName,
			suffix,
		), nil
	}
	return fmt.Sprintf(
		"https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:%s",
		meta.Config.Region,
		meta.Config.VertexAIProjectID,
		meta.Config.Region,
		meta.ActualModelName,
		suffix,
	), nil
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Request, meta *meta.Meta) error {
	channelhelper.SetupCommonRequestHeader(c, req, meta)
	token, err := getToken(c, meta.ChannelID, meta.Config.VertexAIADC)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return nil
}

func (a *Adaptor) ConvertImageRequest(request *relaymodel.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) DoRequest(c *gin.Context, meta *meta.Meta, requestBody io.Reader) (*http.Response, error) {
	return channelhelper.DoRequestHelper(a, c, meta, requestBody)
}
