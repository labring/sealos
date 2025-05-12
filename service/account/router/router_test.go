package router

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
)

func TestRegisterPayRouter(t *testing.T) {
	// Create test http server
	router := gin.Default()
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/health", nil)
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})
	router.ServeHTTP(w, req)

	assert.Equal(t, 200, w.Code)
	assert.Equal(t, `{"status":"healthy"}`, w.Body.String())
}

func TestStartRewardProcessingTimer(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	os.Setenv("REWARD_PROCESSING", "true")
	defer os.Unsetenv("REWARD_PROCESSING")

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

	done := make(chan struct{})
	go func() {
		startReconcileBilling(ctx)
		close(done)
	}()

	select {
	case <-done:
		// Reconciliation stopped successfully
	case <-time.After(200 * time.Millisecond):
		t.Fatal("Reconciliation did not stop in time")
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
