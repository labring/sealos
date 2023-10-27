package database

import (
	"crypto/sha256"
	"encoding/hex"
	"os"
)

var (
	saltKey = os.Getenv("PASSWORD_SALT")
)

func hashPassword(password string) string {
	hash := sha256.New()
	hash.Write([]byte(password + saltKey))
	return hex.EncodeToString(hash.Sum(nil))
}
