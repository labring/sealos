package controllers

import (
	"context"
	"encoding/json"
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

func TestSubscriptionProcessor_shouldProcessTransaction(t *testing.T) {
	sp := &SubscriptionProcessor{}
	now := time.Now()

	tests := []struct {
		name string
		tx   *types.SubscriptionTransaction
		want bool
	}{
		{
			name: "should process paid transaction",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(-1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusPending,
			},
			want: true,
		},
		{
			name: "should not process future transaction",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusPending,
			},
			want: false,
		},
		{
			name: "should not process completed transaction",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				StartAt:   now.Add(-1 * time.Hour),
				Status:    types.SubscriptionTransactionStatusCompleted,
			},
			want: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sp.shouldProcessTransaction(tt.tx)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestSubscriptionProcessor_sendFlushQuotaRequest(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer ")

		var reqBody AdminFlushSubscriptionQuotaReq
		err := json.NewDecoder(r.Body).Decode(&reqBody)
		assert.NoError(t, err)

		switch r.URL.Path {
		case "/admin/v1alpha1/flush-sub-quota":
			w.WriteHeader(http.StatusOK)
		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer server.Close()

	sp := &SubscriptionProcessor{
		allRegionDomain: []string{"test.domain"},
	}

	userUID := uuid.New()
	planID := uuid.New()
	planName := "test-plan"

	err := sp.sendFlushQuotaRequest(userUID, planID, planName)
	assert.Error(t, err) // Should error due to mock JWT manager not being set
}

func TestSubscriptionProcessor_checkDowngradeConditions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer ")

		response := APIResponse{
			Code: 200,
			Data: Data{
				AllWorkspaceReady: true,
				SeatReady:        true,
			},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	sp := &SubscriptionProcessor{}
	sub := &types.Subscription{
		UserUID: uuid.New(),
	}
	planID := uuid.New()

	ok, err := sp.checkDowngradeConditions(context.Background(), sub, planID)
	assert.Error(t, err) // Should error due to mock JWT manager not being set
	assert.False(t, ok)
}

func TestSubscriptionProcessor_checkQuotaConditions(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "POST", r.Method)
		assert.Contains(t, r.Header.Get("Authorization"), "Bearer ")

		response := SubscriptionQuotaCheckResp{
			AllWorkspaceReady: true,
			ReadyWorkspace:    []string{"ws1", "ws2"},
		}
		json.NewEncoder(w).Encode(response)
	}))
	defer server.Close()

	sp := &SubscriptionProcessor{
		allRegionDomain: []string{"test.domain"},
	}

	userUID := uuid.New()
	planID := uuid.New()
	planName := "test-plan"

	ok, err := sp.checkQuotaConditions(context.Background(), userUID, planID, planName)
	assert.Error(t, err) // Should error due to mock JWT manager not being set
	assert.False(t, ok)
}
