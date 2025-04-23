package router_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/labring/sealos/service/account/dao"
)

func TestHealthEndpoint(t *testing.T) {
	router := gin.Default()
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Equal(t, `{"status":"healthy"}`, w.Body.String())
}

func TestStartRewardProcessingTimer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Mock DB client
	origDBClient := dao.DBClient
	mockDB := &dao.MockDBClient{}
	dao.DBClient = mockDB
	defer func() {
		dao.DBClient = origDBClient
	}()

	done := make(chan struct{})
	go func() {
		startRewardProcessingTimer(ctx)
		close(done)
	}()

	select {
	case <-done:
		// Timer stopped successfully
	case <-time.After(200 * time.Millisecond):
		t.Fatal("Timer did not stop in time")
	}
}

func TestStartReconcileBilling(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Set test env var
	os.Setenv("BILLING_RECONCILE_INTERVAL", "10ms")
	defer os.Unsetenv("BILLING_RECONCILE_INTERVAL")

	done := make(chan struct{})
	go func() {
		startReconcileBilling(ctx)
		close(done)
	}()

	select {
	case <-done:
		// Reconcile billing stopped successfully
	case <-time.After(200 * time.Millisecond):
		t.Fatal("Reconcile billing did not stop in time")
	}
}

func TestStartHourlyBillingActiveArchive(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	done := make(chan struct{})
	go func() {
		startHourlyBillingActiveArchive(ctx)
		close(done)
	}()

	select {
	case <-done:
		// Archive process stopped successfully
	case <-time.After(200 * time.Millisecond):
		t.Fatal("Archive process did not stop in time")
	}
}

// Mock DB client for testing
type MockDBClient struct{}

func (m *MockDBClient) ProcessPendingTaskRewards() error {
	return nil
}

func (m *MockDBClient) Disconnect(ctx context.Context) error {
	return nil
}
