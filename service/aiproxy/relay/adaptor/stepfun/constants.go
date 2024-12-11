package stepfun

import (
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/relaymode"
)

var ModelList = []*model.ModelConfig{
	{
		Model: "step-1-8k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1-32k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1-128k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1-256k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1-flash",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-2-16k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1v-8k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1v-32k",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
	{
		Model: "step-1x-medium",
		Type:  relaymode.ChatCompletions,
		Owner: model.ModelOwnerStepFun,
	},
}
