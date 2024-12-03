package channeltype

var ChannelBaseURLs = map[int]string{
	OpenAI:         "https://api.openai.com",
	API2D:          "https://oa.api2d.net",
	Azure:          "",
	CloseAI:        "https://api.closeai-proxy.xyz",
	OpenAISB:       "https://api.openai-sb.com",
	OpenAIMax:      "https://api.openaimax.com",
	OhMyGPT:        "https://api.ohmygpt.com",
	Custom:         "",
	Ails:           "https://api.caipacity.com",
	AIProxy:        "https://api.aiproxy.io",
	PaLM:           "https://generativelanguage.googleapis.com",
	API2GPT:        "https://api.api2gpt.com",
	AIGC2D:         "https://api.aigc2d.com",
	Anthropic:      "https://api.anthropic.com",
	Baidu:          "https://aip.baidubce.com",
	Zhipu:          "https://open.bigmodel.cn",
	Ali:            "https://dashscope.aliyuncs.com",
	Xunfei:         "https://spark-api-open.xf-yun.com",
	AI360:          "https://ai.360.cn",
	OpenRouter:     "https://openrouter.ai/api",
	AIProxyLibrary: "https://api.aiproxy.io",
	FastGPT:        "https://fastgpt.run/api/openapi",
	Tencent:        "https://hunyuan.tencentcloudapi.com",
	Gemini:         "https://generativelanguage.googleapis.com",
	Moonshot:       "https://api.moonshot.cn",
	Baichuan:       "https://api.baichuan-ai.com",
	Minimax:        "https://api.minimax.chat",
	Mistral:        "https://api.mistral.ai",
	Groq:           "https://api.groq.com/openai",
	Ollama:         "http://localhost:11434",
	LingYiWanWu:    "https://api.lingyiwanwu.com",
	StepFun:        "https://api.stepfun.com",
	AwsClaude:      "",
	Coze:           "https://api.coze.com",
	Cohere:         "https://api.cohere.ai",
	DeepSeek:       "https://api.deepseek.com",
	Cloudflare:     "https://api.cloudflare.com",
	DeepL:          "https://api-free.deepl.com",
	TogetherAI:     "https://api.together.xyz",
	Doubao:         "https://ark.cn-beijing.volces.com",
	Novita:         "https://api.novita.ai/v3/openai",
	VertextAI:      "",
	SiliconFlow:    "https://api.siliconflow.cn",
}

func init() {
	if len(ChannelBaseURLs) != Dummy-1 {
		panic("channel base urls length not match")
	}
}
