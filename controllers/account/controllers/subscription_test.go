package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"gorm.io/gorm"
)

type MockDB struct {
	mock.Mock
}

func (m *MockDB) WithContext(ctx context.Context) *gorm.DB {
	args := m.Called(ctx)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Model(value interface{}) *gorm.DB {
	args := m.Called(value)
	return args.Get(0).(*gorm.DB)
}

func (m *MockDB) Where(query interface{}, args ...interface{}) *gorm.DB {
	callArgs := []interface{}{query}
	callArgs = append(callArgs, args...)
	mockArgs := m.Called(callArgs...)
	return mockArgs.Get(0).(*gorm.DB)
}

func (m *MockDB) Find(dest interface{}, conds ...interface{}) *gorm.DB {
	args := m.Called(dest, conds)
	return args.Get(0).(*gorm.DB)
}

func TestSubscriptionProcessor_checkDowngradeConditions(t *testing.T) {
	tests := []struct {
		name           string
		subscription   *types.Subscription
		planID        uuid.UUID
		serverHandler  http.HandlerFunc
		expectedOK    bool
		expectedError error
	}{
		{
			name: "successful check - conditions met",
			subscription: &types.Subscription{
				UserUID: uuid.New(),
			},
			planID: uuid.New(),
			serverHandler: func(w http.ResponseWriter, r *http.Request) {
				resp := APIResponse{
					Code: 200,
					Data: Data{
						AllWorkspaceReady: true,
						SeatReady:        true,
					},
				}
				json.NewEncoder(w).Encode(resp)
			},
			expectedOK:    true,
			expectedError: nil,
		},
		{
			name: "conditions not met",
			subscription: &types.Subscription{
				UserUID: uuid.New(),
			},
			planID: uuid.New(),
			serverHandler: func(w http.ResponseWriter, r *http.Request) {
				resp := APIResponse{
					Code: 200,
					Data: Data{
						AllWorkspaceReady: false,
						SeatReady:        false,
					},
				}
				json.NewEncoder(w).Encode(resp)
			},
			expectedOK:    false,
			expectedError: nil,
		},
		{
			name: "server error",
			subscription: &types.Subscription{
				UserUID: uuid.New(),
			},
			planID: uuid.New(),
			serverHandler: func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusInternalServerError)
			},
			expectedOK:    false,
			expectedError: fmt.Errorf("unexpected status code: 500; "),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server := httptest.NewServer(tt.serverHandler)
			defer server.Close()

			sp := &SubscriptionProcessor{}

			ok, err := sp.checkDowngradeConditions(context.Background(), tt.subscription, tt.planID)

			if tt.expectedError != nil {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.expectedError.Error())
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expectedOK, ok)
			}
		})
	}
}

func TestSubscriptionProcessor_shouldProcessTransaction(t *testing.T) {
	now := time.Now()

	tests := []struct {
		name     string
		tx       *types.SubscriptionTransaction
		expected bool
	}{
		{
			name: "should process - valid transaction",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(-1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusPending,
			},
			expected: true,
		},
		{
			name: "should not process - already completed",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(-1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusCompleted,
			},
			expected: false,
		},
		{
			name: "should not process - future start time",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusPending,
			},
			expected: false,
		},
		{
			name: "should not process - failed status",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(-1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusFailed,
			},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			sp := &SubscriptionProcessor{}
			result := sp.shouldProcessTransaction(tt.tx)
			assert.Equal(t, tt.expected, result)
		})
	}
}
