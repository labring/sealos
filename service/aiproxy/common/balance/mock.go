package balance

import "context"

var _ GroupBalance = (*MockGroupBalance)(nil)

const (
	mockBalance = 10000000
)

type MockGroupBalance struct{}

func NewMockGroupBalance() *MockGroupBalance {
	return &MockGroupBalance{}
}

func (q *MockGroupBalance) GetGroupRemainBalance(_ context.Context, _ string) (float64, PostGroupConsumer, error) {
	return mockBalance, q, nil
}

func (q *MockGroupBalance) PostGroupConsume(_ context.Context, _ string, usage float64) (float64, error) {
	return usage, nil
}

func (q *MockGroupBalance) GetBalance(_ context.Context) (float64, error) {
	return mockBalance, nil
}
