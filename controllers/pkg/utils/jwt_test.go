package utils

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt"
)

func TestAdminTokenClaims(t *testing.T) {
	manager := NewJWTManager("admin-secret", time.Hour)
	token, err := manager.GenerateAdminToken(JwtUser{Requester: "ordinary-user"})
	if err != nil {
		t.Fatalf("GenerateAdminToken() error = %v", err)
	}

	user, err := manager.ParseAdminUser(token)
	if err != nil {
		t.Fatalf("ParseAdminUser() error = %v", err)
	}
	if user.Requester != AdminJWTRequester {
		t.Fatalf("ParseAdminUser() requester = %q, want %q", user.Requester, AdminJWTRequester)
	}
}

func TestVerifyAdminTokenRejectsInvalidClaims(t *testing.T) {
	manager := NewJWTManager("admin-secret", time.Hour)
	now := time.Now().Unix()

	tests := []struct {
		name   string
		method jwt.SigningMethod
		claims jwt.StandardClaims
		secret string
	}{
		{
			name: "ordinary claims",
			claims: jwt.StandardClaims{
				ExpiresAt: now + 3600,
			},
			secret: "admin-secret",
		},
		{
			name: "wrong issuer",
			claims: jwt.StandardClaims{
				ExpiresAt: now + 3600,
				Issuer:    "account-api",
				Audience:  AdminJWTAudience,
			},
			secret: "admin-secret",
		},
		{
			name: "wrong audience",
			claims: jwt.StandardClaims{
				ExpiresAt: now + 3600,
				Issuer:    AdminJWTIssuer,
				Audience:  "account-api",
			},
			secret: "admin-secret",
		},
		{
			name: "expired",
			claims: jwt.StandardClaims{
				ExpiresAt: now - 1,
				Issuer:    AdminJWTIssuer,
				Audience:  AdminJWTAudience,
			},
			secret: "admin-secret",
		},
		{
			name: "wrong secret",
			claims: jwt.StandardClaims{
				ExpiresAt: now + 3600,
				Issuer:    AdminJWTIssuer,
				Audience:  AdminJWTAudience,
			},
			secret: "api-secret",
		},
		{
			name:   "wrong algorithm",
			method: jwt.SigningMethodHS512,
			claims: jwt.StandardClaims{
				ExpiresAt: now + 3600,
				Issuer:    AdminJWTIssuer,
				Audience:  AdminJWTAudience,
			},
			secret: "admin-secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			method := tt.method
			if method == nil {
				method = jwt.SigningMethodHS256
			}
			claims := UserClaims{
				StandardClaims: tt.claims,
				JwtUser:        JwtUser{Requester: AdminJWTRequester},
			}
			token, err := jwt.NewWithClaims(method, claims).SignedString([]byte(tt.secret))
			if err != nil {
				t.Fatalf("SignedString() error = %v", err)
			}

			if _, err = manager.VerifyAdminToken(token); err == nil {
				t.Fatal("VerifyAdminToken() error = nil, want error")
			}
		})
	}
}
