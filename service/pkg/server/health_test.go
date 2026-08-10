package server

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPromServerHealth(t *testing.T) {
	t.Parallel()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, HealthPath, nil)
	if err != nil {
		t.Fatal(err)
	}
	rw := httptest.NewRecorder()

	(&PromServer{}).ServeHTTP(rw, req)

	if rw.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, rw.Code)
	}
	if got := rw.Header().Get("Content-Type"); got != "application/json" {
		t.Fatalf("expected JSON content type, got %q", got)
	}

	var response healthResponse
	if err := json.NewDecoder(rw.Body).Decode(&response); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if response.Status != "healthy" {
		t.Fatalf("expected healthy status, got %q", response.Status)
	}
}

func TestServeHealthRejectsNonGET(t *testing.T) {
	t.Parallel()

	req, err := http.NewRequestWithContext(context.Background(), http.MethodPost, HealthPath, nil)
	if err != nil {
		t.Fatal(err)
	}
	rw := httptest.NewRecorder()

	ServeHealth(rw, req)

	if rw.Code != http.StatusMethodNotAllowed {
		t.Fatalf("expected status %d, got %d", http.StatusMethodNotAllowed, rw.Code)
	}
	if got := rw.Header().Get("Allow"); got != http.MethodGet {
		t.Fatalf("expected Allow header %q, got %q", http.MethodGet, got)
	}
}
