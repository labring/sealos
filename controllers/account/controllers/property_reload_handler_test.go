package controllers

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/labring/sealos/controllers/pkg/utils"
)

func TestAuthenticateAdminRequestUsesDedicatedSecret(t *testing.T) {
	adminManager := utils.NewJWTManager("admin-secret", time.Hour)
	legacyManager := utils.NewJWTManager("api-secret", time.Hour)

	tests := []struct {
		name       string
		manager    *utils.JWTManager
		requester  string
		adminToken bool
		wantErr    bool
	}{
		{
			name:       "dedicated admin token",
			manager:    adminManager,
			requester:  AdminUserName,
			adminToken: true,
		},
		{
			name:      "admin key token without admin claims",
			manager:   adminManager,
			requester: AdminUserName,
			wantErr:   true,
		},
		{
			name:      "legacy admin token",
			manager:   legacyManager,
			requester: AdminUserName,
		},
		{
			name:      "ordinary api token",
			manager:   legacyManager,
			requester: "user",
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var token string
			var err error
			if tt.adminToken {
				token, err = tt.manager.GenerateAdminToken(utils.JwtUser{Requester: tt.requester})
			} else {
				token, err = tt.manager.GenerateToken(utils.JwtUser{Requester: tt.requester})
			}
			if err != nil {
				t.Fatalf("generate token: %v", err)
			}

			req := httptest.NewRequest(http.MethodPost, "/reload-property-types", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			err = authenticateAdminRequest(req, "admin-secret", "api-secret")
			if (err != nil) != tt.wantErr {
				t.Fatalf("authenticateAdminRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
