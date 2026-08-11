package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	commonserver "github.com/labring/sealos/service/pkg/server"
)

func TestVLogsServerHealth(t *testing.T) {
	t.Parallel()

	req, err := http.NewRequestWithContext(
		context.Background(),
		http.MethodGet,
		commonserver.HealthPath,
		nil,
	)
	if err != nil {
		t.Fatal(err)
	}
	rw := httptest.NewRecorder()

	(&VLogsServer{}).ServeHTTP(rw, req)

	if rw.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rw.Code)
	}
}
