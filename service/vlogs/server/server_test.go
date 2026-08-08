package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	commonserver "github.com/labring/sealos/service/pkg/server"
)

func TestVLogsServerHealth(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(http.MethodGet, commonserver.HealthPath, nil)
	rw := httptest.NewRecorder()

	(&VLogsServer{}).ServeHTTP(rw, req)

	if rw.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rw.Code)
	}
}
