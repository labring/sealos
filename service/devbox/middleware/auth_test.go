package middleware

import (
	"github.com/golang-jwt/jwt/v5"
	"log"
	"testing"
	"time"
)

func TestAuth(t *testing.T) {
	secret, _ := GenerateTokenWithExpiry("1234567890", time.Hour)
	log.Printf(secret)
}

// GenerateTokenWithExpiry generates a JWT token with only the expiration time
func GenerateTokenWithExpiry(secret string, duration time.Duration) (string, error) {
	claims := jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(duration)),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}
