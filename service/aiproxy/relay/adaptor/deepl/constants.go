package deepl

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

// https://developers.deepl.com/docs/api-reference/glossaries

var ModelList = []*model.ModelConfigItem{
	{
		Model: "deepl-zh",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "deepl-en",
		Type:  relaymode.ChatCompletions,
	},
	{
		Model: "deepl-ja",
		Type:  relaymode.ChatCompletions,
	},
}
