package api

import (
	"fmt"
	"net/http"
	"testing"

	"github.com/labring/sealos/service/account/dao"
)

func TestUseGiftCodeErrorResponse(t *testing.T) {
	tests := []struct {
		name        string
		err         error
		wantStatus  int
		wantMessage string
	}{
		{
			name:        "already used",
			err:         dao.ErrGiftCodeAlreadyUsed,
			wantStatus:  http.StatusConflict,
			wantMessage: "gift code is already used",
		},
		{
			name:        "wrapped already used",
			err:         fmt.Errorf("redeem failed: %w", dao.ErrGiftCodeAlreadyUsed),
			wantStatus:  http.StatusConflict,
			wantMessage: "gift code is already used",
		},
		{
			name:        "expired",
			err:         dao.ErrGiftCodeExpired,
			wantStatus:  http.StatusBadRequest,
			wantMessage: "gift code has expired",
		},
		{
			name:        "not found",
			err:         dao.ErrGiftCodeNotFound,
			wantStatus:  http.StatusNotFound,
			wantMessage: "gift code not found",
		},
		{
			name:        "internal",
			err:         fmt.Errorf("database unavailable"),
			wantStatus:  http.StatusInternalServerError,
			wantMessage: "failed to use gift code: database unavailable",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, message := useGiftCodeErrorResponse(tt.err)
			if status != tt.wantStatus {
				t.Fatalf("status = %d, want %d", status, tt.wantStatus)
			}
			if message != tt.wantMessage {
				t.Fatalf("message = %q, want %q", message, tt.wantMessage)
			}
		})
	}
}
