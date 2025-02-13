package aws

import (
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var _ adaptor.Adaptor = new(Adaptor)

type Adaptor struct{}

func (a *Adaptor) GetBaseURL() string {
	return ""
}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	adaptor := GetAdaptor(meta.ActualModel)
	if adaptor == nil {
		return "", nil, nil, errors.New("adaptor not found")
	}
	meta.Set("awsAdapter", adaptor)
	return adaptor.ConvertRequest(meta, req)
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context, _ *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	adaptor, ok := meta.Get("awsAdapter")
	if !ok {
		return nil, &relaymodel.ErrorWithStatusCode{
			StatusCode: http.StatusInternalServerError,
			Error:      relaymodel.Error{Message: "awsAdapter not found"},
		}
	}
	return adaptor.(utils.AwsAdapter).DoResponse(meta, c)
}

func (a *Adaptor) GetModelList() (models []*model.ModelConfig) {
	models = make([]*model.ModelConfig, 0, len(adaptors))
	for _, model := range adaptors {
		models = append(models, model.config)
	}
	return
}

func (a *Adaptor) GetChannelName() string {
	return "aws"
}

func (a *Adaptor) GetRequestURL(_ *meta.Meta) (string, error) {
	return "", nil
}

func (a *Adaptor) SetupRequestHeader(_ *meta.Meta, _ *gin.Context, _ *http.Request) error {
	return nil
}

func (a *Adaptor) DoRequest(_ *meta.Meta, _ *gin.Context, _ *http.Request) (*http.Response, error) {
	return nil, nil
}
