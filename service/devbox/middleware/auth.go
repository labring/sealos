package middleware

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func TokenAuth(c *gin.Context) {
	key := c.Request.Header.Get("Authorization")
	if err := parseToken(key); err != nil {
		slog.Error("Failed to parse token", "Error", err)
		c.JSON(http.StatusUnauthorized, gin.H{"msg": "Invalid token"})
		c.Abort()
		return
	}
	c.Next()
}

func parseToken(token string) error {
	_, err := jwt.Parse(token, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWTSecret")), nil
	})

	if err != nil {
		return err
	}

	return err
}
