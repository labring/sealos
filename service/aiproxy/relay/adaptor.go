package relay

import (
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aiproxy"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ali"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/baidu"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/cloudflare"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/cohere"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/coze"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/deepl"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ollama"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/palm"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/tencent"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/xunfei"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/zhipu"
	"github.com/labring/sealos/service/aiproxy/relay/apitype"
)

func GetAdaptor(apiType int) adaptor.Adaptor {
	switch apiType {
	case apitype.AIProxyLibrary:
		return &aiproxy.Adaptor{}
	case apitype.Ali:
		return &ali.Adaptor{}
	case apitype.Anthropic:
		return &anthropic.Adaptor{}
	case apitype.AwsClaude:
		return &aws.Adaptor{}
	case apitype.Baidu:
		return &baidu.Adaptor{}
	case apitype.Gemini:
		return &gemini.Adaptor{}
	case apitype.OpenAI:
		return &openai.Adaptor{}
	case apitype.PaLM:
		return &palm.Adaptor{}
	case apitype.Tencent:
		return &tencent.Adaptor{}
	case apitype.Xunfei:
		return &xunfei.Adaptor{}
	case apitype.Zhipu:
		return &zhipu.Adaptor{}
	case apitype.Ollama:
		return &ollama.Adaptor{}
	case apitype.Coze:
		return &coze.Adaptor{}
	case apitype.Cohere:
		return &cohere.Adaptor{}
	case apitype.Cloudflare:
		return &cloudflare.Adaptor{}
	case apitype.DeepL:
		return &deepl.Adaptor{}
	case apitype.VertexAI:
		return &vertexai.Adaptor{}
	}
	return nil
}
