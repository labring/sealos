package utils

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type AwsAdapter interface {
	ConvertRequest(meta *meta.Meta, req *http.Request) (http.Header, io.Reader, error)
	DoResponse(meta *meta.Meta, c *gin.Context) (usage *model.Usage, err *model.ErrorWithStatusCode)
}
