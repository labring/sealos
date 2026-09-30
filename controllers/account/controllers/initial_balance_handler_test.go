package controllers

import (
	"encoding/json"
	"errors"
	"net/http/httptest"
	"testing"
)

func TestParseInitialBalance(t *testing.T) {
	for _, tc := range []struct {
		raw     string
		want    int64
		invalid bool
	}{
		{"", 5000000, false}, {"0", 0, false}, {"7250000", 7250000, false},
		{"9223372036854775807", 9223372036854775807, false},
		{"5e+06", 0, true}, {"-1", 0, true}, {"1.5", 0, true},
		{" 5000000", 0, true}, {"9223372036854775808", 0, true},
	} {
		t.Run(tc.raw, func(t *testing.T) {
			got, err := ParseInitialBalance(tc.raw, 5000000)
			if (err != nil) != tc.invalid || got != tc.want {
				t.Fatalf("got (%d, %v), want (%d, invalid=%v)", got, err, tc.want, tc.invalid)
			}
		})
	}
}

func TestInitialBalanceHandler(t *testing.T) {
	for _, tc := range []struct {
		name, method string
		configError  error
		want         int
	}{
		{"resolved policy without authentication", "GET", nil, 200},
		{"write method", "POST", nil, 405},
		{"invalid explicit configuration", "GET", errors.New("invalid"), 503},
	} {
		t.Run(tc.name, func(t *testing.T) {
			h := InitialBalanceHandler{Balance: 7250000, RegionUID: "region-uid", ConfigError: tc.configError}
			r := httptest.NewRequest(tc.method, "/v1alpha1/account-initial-balance", nil)
			w := httptest.NewRecorder()
			h.ServeHTTP(w, r)
			if w.Code != tc.want {
				t.Fatalf("status %d, want %d", w.Code, tc.want)
			}
			if w.Code == 405 && w.Header().Get("Allow") != "GET" {
				t.Fatal("method rejection must advertise GET")
			}
			if w.Header().Get("Cache-Control") != "no-store" {
				t.Fatal("policy must not be cached")
			}
			if w.Code == 200 {
				var body map[string]any
				if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if body["balance"] != "7250000" || body["unitsPerYuan"] != "1000000" || body["regionUid"] != "region-uid" || body["version"] != float64(1) {
					t.Fatalf("unexpected policy: %v", body)
				}
			}
		})
	}
}
