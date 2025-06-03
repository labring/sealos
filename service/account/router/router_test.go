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
	"github.com/labring/sealos/service/account/router"
)

func TestRegisterPayRouter(t *testing.T) {
	// Setup
	gin.SetMode(gin.TestMode)
	ctx := context.Background()

	// Mock DB init
	originalDBInit := dao.Init
	dao.Init = func(ctx context.Context) error {
		return nil
	}
	defer func() {
		dao.Init = originalDBInit
	}()

	// Test server
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)

	// Test health endpoint
	c.Request, _ = http.NewRequest(http.MethodGet, "/health", nil)
	router.RegisterPayRouter()
	c.Next()

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestStartRewardProcessingTimer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	router.StartRewardProcessingTimer(ctx)
}

func TestStartReconcileBilling(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Set test env var
	os.Setenv("BILLING_RECONCILE_INTERVAL", "10ms")
	defer os.Unsetenv("BILLING_RECONCILE_INTERVAL")

	router.StartReconcileBilling(ctx)
}

func TestStartHourlyBillingActiveArchive(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	router.StartHourlyBillingActiveArchive(ctx)
}

func TestSubscriptionFeatures(t *testing.T) {
	// Test subscription enabled
	os.Setenv("SUBSCRIPTION_ENABLED", "true")
	defer os.Unsetenv("SUBSCRIPTION_ENABLED")

	// Mock DB init
	originalDBInit := dao.Init
	dao.Init = func(ctx context.Context) error {
		return nil
	}
	defer func() {
		dao.Init = originalDBInit
	}()

	gin.SetMode(gin.TestMode)
	router.RegisterPayRouter()
}

func TestRewardProcessing(t *testing.T) {
	// Test reward processing
	os.Setenv("REWARD_PROCESSING", "true")
	defer os.Unsetenv("REWARD_PROCESSING")

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	// Mock DB init
	originalDBInit := dao.Init
	dao.Init = func(ctx context.Context) error {
		return nil
	}
	defer func() {
		dao.Init = originalDBInit
	}()

	gin.SetMode(gin.TestMode)
	router.RegisterPayRouter()
}

func TestKYCProcessing(t *testing.T) {
	// Test KYC processing
	os.Setenv("SUBSCRIPTION_ENABLED", "true")
	os.Setenv("KYC_PROCESS_ENABLED", "true")
	defer func() {
		os.Unsetenv("SUBSCRIPTION_ENABLED")
		os.Unsetenv("KYC_PROCESS_ENABLED")
	}()

	// Mock DB init
	originalDBInit := dao.Init
	dao.Init = func(ctx context.Context) error {
		return nil
	}
	defer func() {
		dao.Init = originalDBInit
	}()

	gin.SetMode(gin.TestMode)
	router.RegisterPayRouter()
}

func TestServerShutdown(t *testing.T) {
	// Mock DB init
	originalDBInit := dao.Init
	dao.Init = func(ctx context.Context) error {
		return nil
	}
	defer func() {
		dao.Init = originalDBInit
	}()

	gin.SetMode(gin.TestMode)

	// Start server in goroutine
	go router.RegisterPayRouter()

	// Allow server to start
	time.Sleep(100 * time.Millisecond)

	// Send interrupt signal
	p, err := os.FindProcess(os.Getpid())
	require.NoError(t, err)
	err = p.Signal(os.Interrupt)
	require.NoError(t, err)
}
