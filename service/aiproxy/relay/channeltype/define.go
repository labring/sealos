package channeltype

import (
	"github.com/labring/sealos/service/aiproxy/relay/adaptor"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ai360"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ali"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/anthropic"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/aws"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/azure"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/baichuan"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/baidu"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/cloudflare"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/cohere"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/coze"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/deepseek"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/doubao"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/gemini"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/groq"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/lingyiwanwu"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/minimax"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/mistral"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/moonshot"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/novita"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ollama"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/siliconflow"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/stepfun"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/tencent"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/vertexai"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/xunfei"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/zhipu"
)

var ChannelAdaptor = map[int]adaptor.Adaptor{
	1:  &openai.Adaptor{},
	3:  &azure.Adaptor{},
	14: &anthropic.Adaptor{},
	15: &baidu.Adaptor{},
	16: &zhipu.Adaptor{},
	17: &ali.Adaptor{},
	18: &xunfei.Adaptor{},
	19: &ai360.Adaptor{},
	23: &tencent.Adaptor{},
	24: &gemini.Adaptor{},
	25: &moonshot.Adaptor{},
	26: &baichuan.Adaptor{},
	27: &minimax.Adaptor{},
	28: &mistral.Adaptor{},
	29: &groq.Adaptor{},
	30: &ollama.Adaptor{},
	31: &lingyiwanwu.Adaptor{},
	32: &stepfun.Adaptor{},
	33: &aws.Adaptor{},
	34: &coze.Adaptor{},
	35: &cohere.Adaptor{},
	36: &deepseek.Adaptor{},
	37: &cloudflare.Adaptor{},
	40: &doubao.Adaptor{},
	41: &novita.Adaptor{},
	42: &vertexai.Adaptor{},
	43: &siliconflow.Adaptor{},
}

func GetAdaptor(channel int) (adaptor.Adaptor, bool) {
	a, ok := ChannelAdaptor[channel]
	return a, ok
}

var ChannelNames = map[int]string{}

func init() {
	for i, adaptor := range ChannelAdaptor {
		ChannelNames[i] = adaptor.GetChannelName()
	}
}
