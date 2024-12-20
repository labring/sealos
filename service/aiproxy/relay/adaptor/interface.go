package adaptor

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type Adaptor interface {
	GetChannelName() string
	GetRequestURL(meta *meta.Meta) (string, error)
	SetupRequestHeader(meta *meta.Meta, c *gin.Context, req *http.Request) error
	ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error)
	DoRequest(meta *meta.Meta, c *gin.Context, req *http.Request) (*http.Response, error)
	DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (*relaymodel.Usage, *relaymodel.ErrorWithStatusCode)
	GetModelList() []*model.ModelConfig
}

type GetBalance interface {
	GetBalance(channel *model.Channel) (float64, error)
}
