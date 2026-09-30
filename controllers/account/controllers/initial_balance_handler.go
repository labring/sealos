package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
)

// ParseInitialBalance uses the same signed int64 micro-unit representation as
// Account.Balance. Empty configuration retains the platform's compiled default.
// Scientific notation is intentionally invalid, matching strconv.ParseInt.
func ParseInitialBalance(raw string, defaultBalance int64) (int64, error) {
	if raw == "" {
		return defaultBalance, nil
	}
	balance, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || balance < 0 {
		return 0, fmt.Errorf("BASE_BALANCE must be a non-negative decimal int64 in micro-units")
	}
	return balance, nil
}

// InitialBalanceHandler exposes the startup-resolved policy used by NewAccount.
// This read-only policy endpoint does not require authentication.
// It neither creates nor updates accounts. Invalid explicit configuration must
// not be presented to API callers as a successfully resolved default policy.
type InitialBalanceHandler struct {
	Balance     int64
	RegionUID   string
	ConfigError error
}

func (h *InitialBalanceHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if h.ConfigError != nil || h.Balance < 0 || h.RegionUID == "" {
		http.Error(w, "Platform initial balance configuration is invalid", http.StatusServiceUnavailable)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(struct {
		Version      int    `json:"version"`
		Balance      string `json:"balance"`
		UnitsPerYuan string `json:"unitsPerYuan"`
		RegionUID    string `json:"regionUid"`
	}{1, strconv.FormatInt(h.Balance, 10), "1000000", h.RegionUID})
}
