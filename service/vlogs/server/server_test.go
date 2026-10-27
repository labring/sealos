package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labring/sealos/service/vlogs/config"
)

func TestHealthWithoutBackendOrCredentials(t *testing.T) {
	t.Parallel()
	// An unreachable backend must not affect the process health endpoint.
	server, err := NewVLogsServer(
		&config.Config{Server: config.ServeConfig{Path: "http://127.0.0.1:1"}},
	)
	if err != nil {
		t.Fatal(err)
	}
	for _, method := range []string{http.MethodGet, http.MethodPost, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			t.Parallel()
			rw := httptest.NewRecorder()
			req, err := http.NewRequestWithContext(
				context.Background(),
				method,
				"/health",
				http.NoBody,
			)
			if err != nil {
				t.Fatal(err)
			}
			server.ServeHTTP(rw, req)
			if method != http.MethodGet {
				if rw.Code != http.StatusMethodNotAllowed ||
					rw.Header().Get("Allow") != http.MethodGet {
					t.Fatalf("expected 405 and Allow: GET, got %d %v", rw.Code, rw.Header())
				}
				return
			}
			if rw.Code != http.StatusOK || rw.Header().Get("Content-Type") != "application/json" {
				t.Fatalf("unexpected health response: %d %v", rw.Code, rw.Header())
			}
			var body map[string]string
			if err := json.Unmarshal(
				rw.Body.Bytes(),
				&body,
			); err != nil ||
				body["status"] != "healthy" {
				t.Fatalf("unexpected health body: %s", rw.Body.String())
			}
		})
	}
}

func TestHealthDoesNotBypassBusinessRoutes(t *testing.T) {
	t.Parallel()
	for _, path := range []string{"/queryLogsByParams", "/queryPodList", "/queryLogsByPod", "/health/", "/unknown"} {
		rw := httptest.NewRecorder()
		req, err := http.NewRequestWithContext(
			context.Background(),
			http.MethodGet,
			path,
			http.NoBody,
		)
		if err != nil {
			t.Fatal(err)
		}
		(&VLogsServer{}).ServeHTTP(rw, req)
		if rw.Code == http.StatusOK {
			t.Fatalf("%s unexpectedly succeeded without a valid request or credentials", path)
		}
	}
}
