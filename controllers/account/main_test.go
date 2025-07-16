package main

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockDBClient struct {
	mock.Mock
}

func (m *MockDBClient) InitDefaultPropertyTypeLS() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockDBClient) Disconnect(ctx context.Context) error {
	args := m.Called(ctx)
	return args.Error(0)
}

func TestDurationParsing(t *testing.T) {
	os.Setenv("SKIP_EXPIRED_USER_TIME", "48h")
	durationStr := os.Getenv("SKIP_EXPIRED_USER_TIME")
	duration, err := time.ParseDuration(durationStr)
	assert.NoError(t, err)
	assert.Equal(t, 48*time.Hour, duration)
}

func TestEnvironmentVariables(t *testing.T) {
	tests := []struct {
		name     string
		envKey   string
		envValue string
		want     string
	}{
		{
			name:     "Test DISABLE_WEBHOOKS",
			envKey:   "DISABLE_WEBHOOKS",
			envValue: "true",
			want:     "true",
		},
		{
			name:     "Test SUPPORT_DEBT",
			envKey:   "SUPPORT_DEBT",
			envValue: "true",
			want:     "true",
		},
		{
			name:     "Test DEBT_WEBHOOK_CACHE_USER_TTL",
			envKey:   "DEBT_WEBHOOK_CACHE_USER_TTL",
			envValue: "15",
			want:     "15",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv(tt.envKey, tt.envValue)
			assert.Equal(t, tt.want, os.Getenv(tt.envKey))
		})
	}
}

func TestDBClientOperations(t *testing.T) {
	mockDB := new(MockDBClient)
	ctx := context.Background()

	mockDB.On("InitDefaultPropertyTypeLS").Return(nil)
	mockDB.On("Disconnect", ctx).Return(nil)

	err := mockDB.InitDefaultPropertyTypeLS()
	assert.NoError(t, err)

	err = mockDB.Disconnect(ctx)
	assert.NoError(t, err)

	mockDB.AssertExpectations(t)
}
