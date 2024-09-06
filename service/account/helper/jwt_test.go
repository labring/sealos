package helper

import (
	"testing"
	"time"
)

func TestJWTManager_GenerateToken(t *testing.T) {
	manager := &JWTManager{
		secretKey:     []byte("y"),
		tokenDuration: 1000 * time.Second,
	}
	got, err := manager.GenerateToken(JwtUser{})
	if err != nil {
		t.Errorf("error: %v", err)
	}
	t.Logf("token: %v", got)

	userClaims, err := manager.VerifyToken(got)
	if err != nil {
		t.Errorf("error: %v", err)
	}
	t.Logf("userClaims: %v", userClaims)
}
