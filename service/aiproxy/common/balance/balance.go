package balance

import "context"

type GroupBalance interface {
	GetGroupRemainBalance(ctx context.Context, group string) (float64, PostGroupConsumer, error)
}

type PostGroupConsumer interface {
	PostGroupConsume(ctx context.Context, tokenName string, usage float64) (float64, error)
	GetBalance(ctx context.Context) (float64, error)
}

var Default GroupBalance = NewMockGroupBalance()
