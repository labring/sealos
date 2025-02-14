package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/service/aiproxy/common/balance"
	"github.com/labring/sealos/service/aiproxy/common/ctxkey"
	"github.com/labring/sealos/service/aiproxy/middleware"
	"github.com/labring/sealos/service/aiproxy/model"
	"github.com/labring/sealos/service/aiproxy/relay/meta"
	"github.com/shopspring/decimal"
)

type PreCheckGroupBalanceReq struct {
	InputTokens int
	MaxTokens   int
	InputPrice  float64
	OutputPrice float64
}

func getPreConsumedAmount(req *PreCheckGroupBalanceReq) float64 {
	if req == nil || req.InputPrice == 0 || (req.InputTokens == 0 && req.MaxTokens == 0) {
		return 0
	}
	preConsumedTokens := int64(req.InputTokens)
	if req.MaxTokens != 0 {
		preConsumedTokens += int64(req.MaxTokens)
	}
	return decimal.
		NewFromInt(preConsumedTokens).
		Mul(decimal.NewFromFloat(req.InputPrice)).
		Div(decimal.NewFromInt(model.PriceUnit)).
		InexactFloat64()
}

func checkGroupBalance(req *PreCheckGroupBalanceReq, meta *meta.Meta, groupRemainBalance float64) bool {
	if meta.IsChannelTest {
		return true
	}

	preConsumedAmount := getPreConsumedAmount(req)

	return groupRemainBalance > preConsumedAmount
}

func getGroupBalance(ctx *gin.Context, meta *meta.Meta) (float64, balance.PostGroupConsumer, error) {
	if meta.IsChannelTest {
		return 0, nil, nil
	}

	groupBalance, ok := ctx.Get(ctxkey.GroupBalance)
	if !ok {
		return balance.Default.GetGroupRemainBalance(ctx.Request.Context(), *meta.Group)
	}

	groupBalanceConsumer := groupBalance.(*middleware.GroupBalanceConsumer)
	return groupBalanceConsumer.GroupBalance, groupBalanceConsumer.Consumer, nil
}
