package controller

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/adaptor/openai"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
	"github.com/labring/sealos/service/aiproxy/relay/utils"
)

func RelayTTSHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModel)
		if !ok {
			return nil, fmt.Errorf("model price not found: %s", meta.OriginModel)
		}

		ttsRequest, err := utils.UnmarshalTTSRequest(c.Request)
		if err != nil {
			return nil, err
		}

		return &PreCheckGroupBalanceReq{
			InputTokens: openai.CountTokenText(ttsRequest.Input, meta.ActualModel),
			InputPrice:  price,
			OutputPrice: completionPrice,
		}, nil
	})
}
