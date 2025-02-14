package vertexai

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	channelhelper "github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

var _ channelhelper.Adaptor = new(Adaptor)

const channelName = "vertexai"

type Adaptor struct{}

func (a *Adaptor) GetBaseURL() string {
	return ""
}

type Config struct {
	Region    string
	ProjectID string
	ADCJSON   string
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, request *http.Request) (string, http.Header, io.Reader, error) {
	adaptor := GetAdaptor(meta.ActualModel)
	if adaptor == nil {
		return "", nil, nil, errors.New("adaptor not found")
	}

	return adaptor.ConvertRequest(meta, request)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	adaptor := GetAdaptor(meta.ActualModel)
	if adaptor == nil {
		return nil, openai.ErrorWrapperWithMessage(meta.ActualModel+" adaptor not found", "adaptor_not_found", http.StatusInternalServerError)
	}
	return adaptor.DoResponse(meta, c, resp)
}

func (a *Adaptor) GetModelList() []*model.ModelConfig {
	return modelList
}

func (a *Adaptor) GetChannelName() string {
	return channelName
}

func (a *Adaptor) GetRequestURL(meta *meta.Meta) (string, error) {
	var suffix string
	if strings.HasPrefix(meta.ActualModel, "gemini") {
		if meta.GetBool("stream") {
			suffix = "streamGenerateContent?alt=sse"
		} else {
			suffix = "generateContent"
		}
	} else {
		if meta.GetBool("stream") {
			suffix = "streamRawPredict?alt=sse"
		} else {
			suffix = "rawPredict"
		}
	}

	config, err := getConfigFromKey(meta.Channel.Key)
	if err != nil {
		return "", err
	}

	if meta.Channel.BaseURL != "" {
		return fmt.Sprintf(
			"%s/v1/projects/%s/locations/%s/publishers/google/models/%s:%s",
			meta.Channel.BaseURL,
			config.ProjectID,
			config.Region,
			meta.ActualModel,
			suffix,
		), nil
	}
	return fmt.Sprintf(
		"https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/publishers/google/models/%s:%s",
		config.Region,
		config.ProjectID,
		config.Region,
		meta.ActualModel,
		suffix,
	), nil
}

func (a *Adaptor) SetupRequestHeader(meta *meta.Meta, _ *gin.Context, req *http.Request) error {
	config, err := getConfigFromKey(meta.Channel.Key)
	if err != nil {
		return err
	}
	token, err := getToken(context.Background(), meta.Channel.ID, config.ADCJSON)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	return nil
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, req *http.Request) (*http.Response, error) {
	return utils.DoRequest(req)
}
