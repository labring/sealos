package controller

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/config"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

func RelayTextHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		if !config.GetBillingEnabled() {
			return &PreCheckGroupBalanceReq{}, nil
		}

		inputPrice, outputPrice, ok := GetModelPrice(meta.ModelConfig)
		if !ok {
			return nil, fmt.Errorf("model price not found: %s", meta.OriginModel)
		}

		textRequest, err := utils.UnmarshalGeneralOpenAIRequest(c.Request)
		if err != nil {
			return nil, err
		}

		return &PreCheckGroupBalanceReq{
			InputTokens: openai.GetPromptTokens(meta, textRequest),
			MaxTokens:   textRequest.MaxTokens,
			InputPrice:  inputPrice,
			OutputPrice: outputPrice,
		}, nil
	})
}
