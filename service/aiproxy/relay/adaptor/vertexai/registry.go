package vertexai

import (
	"net/http"

	"github.com/gin-gonic/gin"
	claude "github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai/claude"
	gemini "github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/labring/sealos/service/aiproxy/relay/model"
)

type VertexAIModelType int

const (
	VerterAIClaude VertexAIModelType = iota + 1
	VerterAIGemini
)

var (
	modelMapping = map[string]VertexAIModelType{}
	modelList    = []string{}
)

func init() {
	modelList = append(modelList, claude.ModelList...)
	for _, model := range claude.ModelList {
		modelMapping[model] = VerterAIClaude
	}

	modelList = append(modelList, gemini.ModelList...)
	for _, model := range gemini.ModelList {
		modelMapping[model] = VerterAIGemini
	}
}

type innerAIAdapter interface {
	ConvertRequest(c *gin.Context, relayMode int, request *model.GeneralOpenAIRequest) (any, error)
	DoResponse(c *gin.Context, resp *http.Response, meta *meta.Meta) (usage *model.Usage, err *model.ErrorWithStatusCode)
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
