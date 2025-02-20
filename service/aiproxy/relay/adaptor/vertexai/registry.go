package vertexai

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/model"
	claude "github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai/claude"
	gemini "github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
)

type ModelType int

const (
	VerterAIClaude ModelType = iota + 1
	VerterAIGemini
)

var (
	modelMapping = map[string]ModelType{}
	modelList    = []*model.ModelConfig{}
)

func init() {
	for _, model := range claude.ModelList {
		modelMapping[model.Model] = VerterAIClaude
		modelList = append(modelList, model)
	}

	for _, model := range gemini.ModelList {
		modelMapping[model.Model] = VerterAIGemini
		modelList = append(modelList, model)
	}
}

type innerAIAdapter interface {
	ConvertRequest(meta *meta.Meta, request *http.Request) (string, http.Header, io.Reader, error)
	DoResponse(meta *meta.Meta, c *gin.Context, resp *http.Response) (usage *relaymodel.Usage, err *relaymodel.ErrorWithStatusCode)
}

func GetAdaptor(model string) innerAIAdapter {
	adaptorType := modelMapping[model]
	switch adaptorType {
	case VerterAIClaude:
		return &claude.Adaptor{}
	case VerterAIGemini:
		return &gemini.Adaptor{}
	default:
		return nil
	}
}
