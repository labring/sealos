package aws

import (
	"errors"
	"io"
	"net/http"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/bedrockruntime"
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

var _ adaptor.Adaptor = new(Adaptor)

type Adaptor struct {
	awsAdapter utils.AwsAdapter

	Meta      *meta.Meta
	AwsClient *bedrockruntime.Client
}

func (a *Adaptor) ConvertSTTRequest(*http.Request) (io.ReadCloser, error) {
	return nil, nil
}

func (a *Adaptor) ConvertTTSRequest(*relaymodel.TextToSpeechRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) Init(meta *meta.Meta) {
	a.Meta = meta
	a.AwsClient = bedrockruntime.New(bedrockruntime.Options{
		Region:      meta.Config.Region,
		Credentials: aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(meta.Config.AK, meta.Config.SK, "")),
	})
}

func (a *Adaptor) ConvertRequest(c *gin.Context, relayMode int, request *relaymodel.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	adaptor := GetAdaptor(request.Model)
	if adaptor == nil {
		return nil, errors.New("adaptor not found")
	}

	a.awsAdapter = adaptor
	return adaptor.ConvertRequest(c, relayMode, request)
}

func (a *Adaptor) DoResponse(c *gin.Context, _ *http.Response, meta *meta.Meta) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode) {
	if a.awsAdapter == nil {
		return nil, utils.WrapErr(errors.New("awsAdapter is nil"))
	}
	return a.awsAdapter.DoResponse(c, a.AwsClient, meta)
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

func (a *Adaptor) SetupRequestHeader(_ *gin.Context, _ *http.Request, _ *meta.Meta) error {
	return nil
}

func (a *Adaptor) ConvertImageRequest(request *relaymodel.ImageRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}
	return request, nil
}

func (a *Adaptor) DoRequest(_ *gin.Context, _ *meta.Meta, _ io.Reader) (*http.Response, error) {
	return nil, nil
}
