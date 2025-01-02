package controller

import (
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	relaymodel "github.com/labring/sealos/service/aiproxy/relay/model"
	billingprice "github.com/labring/sealos/service/aiproxy/relay/price"
)

func RelaySTTHelper(meta *meta.Meta, c *gin.Context) *relaymodel.ErrorWithStatusCode {
	return Handle(meta, c, func() (*PreCheckGroupBalanceReq, error) {
		price, completionPrice, ok := billingprice.GetModelPrice(meta.OriginModel)
		if !ok {
			return nil, fmt.Errorf("model price not found: %s", meta.OriginModel)
		}

		return &PreCheckGroupBalanceReq{
			InputPrice:  price,
			OutputPrice: completionPrice,
		}, nil
	})
}
