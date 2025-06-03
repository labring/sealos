package controllers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/labring/sealos/controllers/pkg/database"
	"github.com/labring/sealos/controllers/pkg/types"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

func setupTestServer(t *testing.T) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"code": 200, "message": "success"}`))
	}))
}

func setupTestEnvironment(t *testing.T) (*SubscriptionProcessor, *gorm.DB, func()) {
	server := setupTestServer(t)

	account, err := database.NewAccountV2("", "")
	require.NoError(t, err)

	jwtManager := utils.NewJWTManager("test-secret", time.Hour)
	reconciler := &AccountReconciler{
		AccountV2:  account,
		jwtManager: jwtManager,
	}

	sp := NewSubscriptionProcessor(reconciler)
	sp.allRegionDomain = []string{server.URL}

	cleanup := func() {
		server.Close()
		account.Close()
	}

	return sp, account.GetGlobalDB(), cleanup
}

func Test_sendFlushQuotaRequest(t *testing.T) {
	testCases := []struct {
		name      string
		userUID   uuid.UUID
		planID    uuid.UUID
		planName  string
		wantError bool
	}{
		{
			name:      "successful request",
			userUID:   uuid.New(),
			planID:    uuid.New(),
			planName:  "basic",
			wantError: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			sp, _, cleanup := setupTestEnvironment(t)
			defer cleanup()

			err := sp.sendFlushQuotaRequest(tc.userUID, tc.planID, tc.planName)
			if tc.wantError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestSubscriptionProcessor_processPendingTransactions(t *testing.T) {
	sp, db, cleanup := setupTestEnvironment(t)
	defer cleanup()

	// Create test transaction
	tx := &types.SubscriptionTransaction{
		ID:             uuid.New(),
		SubscriptionID: uuid.New(),
		UserUID:        uuid.New(),
		PayStatus:      types.SubscriptionPayStatusPaid,
		Status:         types.SubscriptionTransactionStatusPending,
		StartAt:        time.Now().Add(-time.Hour),
		Operator:       types.SubscriptionTransactionTypeCreated,
		NewPlanID:      uuid.New(),
		NewPlanName:    "test-plan",
	}

	err := db.Create(tx).Error
	require.NoError(t, err)

	// Create test account
	acc := &types.Account{
		UserUID:        tx.UserUID,
		CreateRegionID: sp.AccountV2.GetLocalRegion().UID.String(),
	}
	err = db.Create(acc).Error
	require.NoError(t, err)

	err = sp.processPendingTransactions(context.Background())
	assert.NoError(t, err)

	// Verify transaction status updated
	var updatedTx types.SubscriptionTransaction
	err = db.First(&updatedTx, "id = ?", tx.ID).Error
	require.NoError(t, err)
	assert.Equal(t, types.SubscriptionTransactionStatusCompleted, updatedTx.Status)
}

func TestSubscriptionProcessor_shouldProcessTransaction(t *testing.T) {
	sp, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	testCases := []struct {
		name     string
		tx       *types.SubscriptionTransaction
		expected bool
	}{
		{
			name: "should process - paid and pending",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				Status:    types.SubscriptionTransactionStatusPending,
				StartAt:   time.Now().Add(-time.Hour),
			},
			expected: true,
		},
		{
			name: "should not process - already completed",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				Status:    types.SubscriptionTransactionStatusCompleted,
				StartAt:   time.Now().Add(-time.Hour),
			},
			expected: false,
		},
		{
			name: "should not process - future start time",
			tx: &types.SubscriptionTransaction{
				PayStatus: types.SubscriptionPayStatusPaid,
				Status:    types.SubscriptionTransactionStatusPending,
				StartAt:   time.Now().Add(time.Hour),
			},
			expected: false,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := sp.shouldProcessTransaction(tc.tx)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestSubscriptionProcessor_Start_Stop(t *testing.T) {
	sp, _, cleanup := setupTestEnvironment(t)
	defer cleanup()

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	err := sp.Start(ctx)
	assert.NoError(t, err)

	// Let it run briefly
	time.Sleep(time.Second)

	sp.Stop()
}
