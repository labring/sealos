package openai

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/ai360"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/baichuan"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/deepseek"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/doubao"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/groq"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/lingyiwanwu"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/minimax"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/mistral"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/moonshot"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/novita"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/siliconflow"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/stepfun"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/togetherai"
	"github.com/labring/sealos/service/aiproxy/relay/channeltype"
)

var CompatibleChannels = []int{
	channeltype.Azure,
	channeltype.AI360,
	channeltype.Moonshot,
	channeltype.Baichuan,
	channeltype.Minimax,
	channeltype.Doubao,
	channeltype.Mistral,
	channeltype.Groq,
	channeltype.LingYiWanWu,
	channeltype.StepFun,
	channeltype.DeepSeek,
	channeltype.TogetherAI,
	channeltype.Novita,
	channeltype.SiliconFlow,
}

func GetCompatibleChannelMeta(channelType int) (string, []*model.ModelConfigItem) {
	switch channelType {
	case channeltype.Azure:
		return "azure", ModelList
	case channeltype.AI360:
		return "360", ai360.ModelList
	case channeltype.Moonshot:
		return "moonshot", moonshot.ModelList
	case channeltype.Baichuan:
		return "baichuan", baichuan.ModelList
	case channeltype.Minimax:
		return "minimax", minimax.ModelList
	case channeltype.Mistral:
		return "mistralai", mistral.ModelList
	case channeltype.Groq:
		return "groq", groq.ModelList
	case channeltype.LingYiWanWu:
		return "lingyiwanwu", lingyiwanwu.ModelList
	case channeltype.StepFun:
		return "stepfun", stepfun.ModelList
	case channeltype.DeepSeek:
		return "deepseek", deepseek.ModelList
	case channeltype.TogetherAI:
		return "together.ai", togetherai.ModelList
	case channeltype.Doubao:
		return "doubao", doubao.ModelList
	case channeltype.Novita:
		return "novita", novita.ModelList
	case channeltype.SiliconFlow:
		return "siliconflow", siliconflow.ModelList
	default:
		return "openai", ModelList
	}
}
