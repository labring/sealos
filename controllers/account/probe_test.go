package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProbeHandler(t *testing.T) {
	state := &probeState{}
	handler := newProbeHandler(state)

	tests := []struct {
		name string
		path string
		want int
	}{
		{name: "health before initialization", path: probeHealthPath, want: http.StatusOK},
		{
			name: "startup before initialization",
			path: probeStartupPath,
			want: http.StatusServiceUnavailable,
		},
		{
			name: "ready before cache sync",
			path: probeReadyPath,
			want: http.StatusServiceUnavailable,
		},
	}
	assertProbeStatuses(t, handler, tests)

	state.markStartupReady()
	assertProbeStatuses(t, handler, []struct {
		name string
		path string
		want int
	}{
		{name: "health after initialization", path: probeHealthPath, want: http.StatusOK},
		{name: "startup after initialization", path: probeStartupPath, want: http.StatusOK},
		{
			name: "ready before cache sync",
			path: probeReadyPath,
			want: http.StatusServiceUnavailable,
		},
	})

	state.markReady()
	assertProbeStatuses(t, handler, []struct {
		name string
		path string
		want int
	}{
		{name: "health when ready", path: probeHealthPath, want: http.StatusOK},
		{name: "startup when ready", path: probeStartupPath, want: http.StatusOK},
		{name: "ready after cache sync", path: probeReadyPath, want: http.StatusOK},
	})
}

func assertProbeStatuses(t *testing.T, handler http.Handler, tests []struct {
	name string
	path string
	want int
},
) {
	t.Helper()

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequestWithContext(
				context.Background(),
				http.MethodGet,
				test.path,
				nil,
			)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)

			if response.Code != test.want {
				t.Fatalf("GET %s returned status %d, want %d", test.path, response.Code, test.want)
			}
		})
	}
}
