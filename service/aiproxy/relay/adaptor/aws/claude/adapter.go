package aws

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws/utils"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

const (
	ConvertedRequest = "convertedRequest"
)

var _ utils.AwsAdapter = new(Adaptor)

type Adaptor struct{}

func (a *Adaptor) ConvertRequest(meta *meta.Meta, req *http.Request) (string, http.Header, io.Reader, error) {
	r, err := anthropic.ConvertRequest(meta, req)
	if err != nil {
		return "", nil, nil, err
	}
	meta.Set(ConvertedRequest, r)
	return "", nil, nil, nil
}

func (a *Adaptor) DoResponse(meta *meta.Meta, c *gin.Context) (usage *model.Usage, err *model.ErrorWithStatusCode) {
	if meta.GetBool("stream") {
		err, usage = StreamHandler(meta, c)
	} else {
		err, usage = Handler(meta, c)
	}
	return
}
