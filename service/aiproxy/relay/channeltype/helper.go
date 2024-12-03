package channeltype

import "github.com/labring/sealos/service/aiproxy/relay/apitype"

func ToAPIType(channelType int) int {
	switch channelType {
	case Anthropic:
		return apitype.Anthropic
	case Baidu:
		return apitype.Baidu
	case PaLM:
		return apitype.PaLM
	case Zhipu:
		return apitype.Zhipu
	case Ali:
		return apitype.Ali
	case Xunfei:
		return apitype.Xunfei
	case AIProxyLibrary:
		return apitype.AIProxyLibrary
	case Tencent:
		return apitype.Tencent
	case Gemini:
		return apitype.Gemini
	case Ollama:
		return apitype.Ollama
	case AwsClaude:
		return apitype.AwsClaude
	case Coze:
		return apitype.Coze
	case Cohere:
		return apitype.Cohere
	case Cloudflare:
		return apitype.Cloudflare
	case DeepL:
		return apitype.DeepL
	case VertextAI:
		return apitype.VertexAI
	default:
		return apitype.OpenAI
	}
}
