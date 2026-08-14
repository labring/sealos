package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/labring/sealos/controllers/pkg/utils"
	"github.com/labring/sealos/service/account/dao"
)

func TestAuthenticateAdminRequestUsesDedicatedSecret(t *testing.T) {
	gin.SetMode(gin.TestMode)

	originalAdminManager := dao.AdminJwtMgr
	originalAPIManager := dao.JwtMgr
	t.Cleanup(func() {
		dao.AdminJwtMgr = originalAdminManager
		dao.JwtMgr = originalAPIManager
	})

	adminManager := utils.NewJWTManager("admin-secret", time.Hour)
	apiManager := utils.NewJWTManager("api-secret", time.Hour)
	dao.AdminJwtMgr = adminManager
	dao.JwtMgr = apiManager

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
			manager:   apiManager,
			requester: AdminUserName,
		},
		{
			name:      "ordinary api token",
			manager:   apiManager,
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

			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = req

			err = authenticateAdminRequest(c)
			if (err != nil) != tt.wantErr {
				t.Fatalf("authenticateAdminRequest() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}
