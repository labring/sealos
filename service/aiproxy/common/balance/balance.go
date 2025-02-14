package balance

import (
	"context"

	"github.com/labring/sealos/service/aiproxy/model"
)

type GroupBalance interface {
	GetGroupRemainBalance(ctx context.Context, group model.GroupCache) (float64, PostGroupConsumer, error)
}

type PostGroupConsumer interface {
	PostGroupConsume(ctx context.Context, tokenName string, usage float64) (float64, error)
}

var Default GroupBalance = NewMockGroupBalance()
